import { PERMIT2_ABI } from '@revoke.cash/core/abis';
import type { Log } from '@revoke.cash/core/events';
import { selectorOf, topicToAddress } from '@revoke.cash/core/events/utils';
import { isNullish } from '@revoke.cash/core/utils';
import { type Address, decodeFunctionData, getAddress, type Hex } from 'viem';
import type { TraceCallFrame, TraceFrameLog } from './trace-client';

export enum TransferClassification {
  APPROVED = 'approved',
  DIRECT = 'direct',
  SIGNATURE_AUTHORIZED = 'signature_authorized',
  OTHER = 'other',
  UNKNOWN = 'unknown',
}

export interface TransferDetailsResult {
  classification: TransferClassification;
  spenderAddress?: Address; // Approved spender = token-level msg.sender OR the Permit2 caller of Permit2 AllowanceTransfer calls
  permit2Address?: Address;
  selector?: Hex;
  error?: string;
}

// Selectors of token methods that move tokens by consuming an allowance / operator approval.
// Verified against computed selectors in the extraction test suite.
export const TRANSFER_FROM_SELECTORS: Hex[] = [
  '0x23b872dd', // transferFrom(address,address,uint256) — ERC-20 and ERC-721
  '0x42842e0e', // safeTransferFrom(address,address,uint256)
  '0xb88d4fde', // safeTransferFrom(address,address,uint256,bytes)
  '0x79cc6790', // burnFrom(address,uint256)
  '0xf2d5d56b', // pull(address,uint256) — DAI-style transferFrom alias
  '0xbb35783b', // move(address,address,uint256) — DAI-style transferFrom alias
  '0xd8fbe994', // transferFromAndCall(address,address,uint256) — ERC-1363
  '0xc1d34b89', // transferFromAndCall(address,address,uint256,bytes) — ERC-1363
];

export const DIRECT_TRANSFER_SELECTOR: Hex = '0xa9059cbb'; // transfer(address,uint256)

export const PERMIT2_ALLOWANCE_TRANSFER_SELECTORS: Hex[] = [
  '0x36c78516', // transferFrom(address,address,uint160,address)
  '0x0d58b1db', // transferFrom((address,address,uint160,address)[])
];

// EIP-3009: tokens move on a signed authorization without any standing allowance.
export const EIP3009_SELECTORS: Hex[] = [
  '0xe3ee160e', // transferWithAuthorization(...,uint8,bytes32,bytes32)
  '0xef55bec6', // receiveWithAuthorization(...,uint8,bytes32,bytes32)
  '0xcf092995', // transferWithAuthorization(...,bytes) — EIP-1271-capable variant
  '0x88b7ab63', // receiveWithAuthorization(...,bytes) — EIP-1271-capable variant
];

export const extractTransferDetails = (trace: TraceCallFrame, transferLogs: Log[]): TransferDetailsResult[] => {
  const traceLogs = collectTraceLogs({ frame: trace });
  return transferLogs.map((transferLog) => {
    const candidates = findCandidateTraceLogs(traceLogs, transferLogs, transferLog);
    if (candidates.length === 0) {
      return { classification: TransferClassification.UNKNOWN, error: 'transfer log not found in trace' };
    }

    const transferFromTopic = transferLog.topics[1];
    const transferFrom = transferFromTopic ? topicToAddress(transferFromTopic) : undefined;
    if (isNullish(transferFrom)) {
      return { classification: TransferClassification.UNKNOWN, error: 'malformed trace frame or transfer log' };
    }

    const candidateResults = candidates.map((candidate) => classifyCandidate(candidate, transferFrom));
    if (candidateResults.some((result) => isNullish(result))) {
      return { classification: TransferClassification.UNKNOWN, error: 'malformed trace frame or transfer log' };
    }

    const [firstResult, ...remainingResults] = candidateResults as TransferDetailsResult[];
    if (remainingResults.some((result) => JSON.stringify(result) !== JSON.stringify(firstResult))) {
      return {
        classification: TransferClassification.UNKNOWN,
        error: 'ambiguous duplicate transfer logs (candidate frames disagree)',
      };
    }

    return firstResult;
  });
};

interface FrameNode {
  frame: TraceCallFrame;
  parent?: FrameNode;
}

interface TraceLogWithNode {
  log: TraceFrameLog;
  node: FrameNode;
  reverted: boolean;
}

// Content-matching trace logs are the candidates for the stored log's emitting frame. Some tracers (e.g.
// Rootstock) copy subcall logs into ancestor frames; surplus copies beyond the receipt count are dropped.
const findCandidateTraceLogs = (
  traceLogs: TraceLogWithNode[],
  transferLogs: Log[],
  transferLog: Log,
): TraceLogWithNode[] => {
  const key = logContentKey(transferLog);
  const allMatchingLogs = traceLogs.filter((traceLog) => logContentKey(traceLog.log) === key);

  // Reverted frames normally cannot have emitted a receipt log, but some clients (Gnosis's Nethermind)
  // mislabel successful frames with a caught child revert
  const cleanMatchingLogs = allMatchingLogs.filter((matchingLog) => !matchingLog.reverted);
  const matchingLogs = cleanMatchingLogs.length > 0 ? cleanMatchingLogs : allMatchingLogs;

  const storedDuplicateCount = transferLogs.filter((log) => logContentKey(log) === key).length;
  if (matchingLogs.length <= storedDuplicateCount) return matchingLogs;

  return matchingLogs.filter(
    (candidate) => !matchingLogs.some((other) => other !== candidate && isAncestorOf(candidate.node, other.node)),
  );
};

const isAncestorOf = (maybeAncestor: FrameNode, node: FrameNode): boolean => {
  if (isNullish(node.parent)) return false;
  if (node.parent === maybeAncestor) return true;
  return isAncestorOf(maybeAncestor, node.parent);
};

const classifyCandidate = (candidate: TraceLogWithNode, transferFrom: Address): TransferDetailsResult | undefined => {
  const boundary = findMsgSenderBoundary(candidate.node);
  if (isNullish(boundary)) return undefined;

  const selector = determineSelector(candidate.node, boundary);
  return classifyFromCall(boundary.frame.from, selector, transferFrom, boundary, candidate.log);
};

const classifyFromCall = (
  msgSender: Address,
  selector: Hex | undefined,
  transferFrom: Address,
  boundaryNode: FrameNode,
  transferLog: TraceFrameLog,
): TransferDetailsResult => {
  if (msgSender.toLowerCase() === transferFrom.toLowerCase()) {
    return { classification: TransferClassification.DIRECT, selector };
  }

  if (!isNullish(selector) && EIP3009_SELECTORS.includes(selector)) {
    return { classification: TransferClassification.SIGNATURE_AUTHORIZED, selector };
  }

  if (!isNullish(selector) && TRANSFER_FROM_SELECTORS.includes(selector)) {
    return {
      classification: TransferClassification.APPROVED,
      spenderAddress: getAddress(msgSender),
      selector,
      ...findPermit2Attribution(boundaryNode, transferLog),
    };
  }

  return { classification: TransferClassification.OTHER, selector };
};

// DELEGATECALL/STATICCALL frames keep the same msg.caller, so they are not boundaries
const MSG_SENDER_BOUNDARY_TYPES = ['CALL', 'CALLCODE', 'CREATE', 'CREATE2'];
const findMsgSenderBoundary = (node: FrameNode | undefined): FrameNode | undefined => {
  if (isNullish(node)) return undefined;
  if (MSG_SENDER_BOUNDARY_TYPES.includes(node.frame.type?.toUpperCase?.() ?? '')) return node;
  return findMsgSenderBoundary(node.parent);
};

// Prefers the closest *recognized* selector, falling back to the boundary frame's selector
const determineSelector = (node: FrameNode | undefined, boundaryNode: FrameNode): Hex | undefined => {
  if (isNullish(node)) return selectorOf(boundaryNode.frame.input);

  const selector = selectorOf(node.frame.input);
  if (isRecognizedTokenSelector(selector)) return selector;
  if (node === boundaryNode) return selectorOf(boundaryNode.frame.input);

  return determineSelector(node.parent, boundaryNode);
};

const isRecognizedTokenSelector = (selector: Hex | undefined): boolean => {
  if (isNullish(selector)) return false;
  return (
    TRANSFER_FROM_SELECTORS.includes(selector) ||
    EIP3009_SELECTORS.includes(selector) ||
    selector === DIRECT_TRANSFER_SELECTOR
  );
};

const collectTraceLogs = (node: FrameNode, inRevertedFrame = false): TraceLogWithNode[] => {
  const reverted = inRevertedFrame || !isNullish(node.frame.error);
  const ownLogs = (node.frame.logs ?? []).map((log) => ({ log, node, reverted }));
  const subcallLogs = (node.frame.calls ?? []).flatMap((call) =>
    collectTraceLogs({ frame: call, parent: node }, reverted),
  );
  return [...ownLogs, ...subcallLogs];
};

const logContentKey = (log: { address: Address; topics?: readonly Hex[]; data?: Hex }): string => {
  return `${log.address.toLowerCase()}|${(log.topics ?? []).join(',').toLowerCase()}|${(log.data ?? '0x').toLowerCase()}`;
};

// Address-independent transfer detail check. Checks whether the boundary calldata is a Permit2 transfer call
// that matches the transfer log.
const findPermit2Attribution = (
  boundaryNode: FrameNode,
  transferLog: TraceFrameLog,
): Pick<TransferDetailsResult, 'spenderAddress' | 'permit2Address'> | undefined => {
  const mediatorBoundary = findMsgSenderBoundary(boundaryNode.parent);
  if (isNullish(mediatorBoundary)) return undefined;

  const mediatorSelector = selectorOf(mediatorBoundary.frame.input);
  if (isNullish(mediatorSelector) || !PERMIT2_ALLOWANCE_TRANSFER_SELECTORS.includes(mediatorSelector)) {
    return undefined;
  }

  const potentialTransferDetails = decodePermit2TransferDetails(mediatorBoundary.frame.input);
  const transferMatchesLog = potentialTransferDetails.some((detail) =>
    permit2TransferDetailMatchesLog(detail, transferLog),
  );
  if (!transferMatchesLog) return undefined;

  return {
    spenderAddress: getAddress(mediatorBoundary.frame.from),
    permit2Address: getAddress(boundaryNode.frame.from),
  };
};

interface Permit2TransferDetail {
  from: Address;
  to: Address;
  amount: bigint;
  token: Address;
}

const decodePermit2TransferDetails = (input: Hex | undefined): Permit2TransferDetail[] => {
  if (isNullish(input)) return [];
  try {
    const { args } = decodeFunctionData({ abi: PERMIT2_ABI, data: input }) as any;
    if (Array.isArray(args[0])) return args[0]; // transferFrom(AllowanceTransferDetails[] calldata transferDetails)
    const [from, to, amount, token] = args; // transferFrom(address,address,uint160,address)
    return [{ from, to, amount, token }];
  } catch {
    return [];
  }
};

const permit2TransferDetailMatchesLog = (detail: Permit2TransferDetail, log: TraceFrameLog): boolean => {
  const [, fromTopic, toTopic] = log.topics ?? [];
  if (isNullish(fromTopic) || isNullish(toTopic) || isNullish(log.data) || log.data === '0x') return false;

  return (
    detail.token.toLowerCase() === log.address.toLowerCase() &&
    detail.from.toLowerCase() === topicToAddress(fromTopic).toLowerCase() &&
    detail.to.toLowerCase() === topicToAddress(toTopic).toLowerCase() &&
    detail.amount === BigInt(log.data)
  );
};
