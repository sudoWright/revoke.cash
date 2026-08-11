import type { Log } from '@revoke.cash/core/events';
import {
  DIRECT_TRANSFER_SELECTOR,
  EIP3009_SELECTORS,
  extractTransferDetails,
  PERMIT2_ALLOWANCE_TRANSFER_SELECTORS,
  TRANSFER_FROM_SELECTORS,
} from '@revoke.cash/core/transfers/trace-classifier';
import type { TraceCallFrame } from '@revoke.cash/core/transfers/trace-client';
import { expect } from 'chai';
import { getAddress, type Hex, toFunctionSelector } from 'viem';
import transferTraceFixtures from './fixtures/transfer-traces.json' with { type: 'json' };

interface ExpectedResult {
  logIndex: number;
  classification: string;
  spenderAddress?: string;
  permit2Address?: string;
  selector?: Hex;
  error?: string;
}

interface TransferTraceFixture {
  name: string;
  description: string;
  chainId: number;
  trace: TraceCallFrame;
  transferLogs: Log[];
  expected: ExpectedResult[];
}

// Real fixtures were recorded from live RPCs with test/fixtures/record-transfer-trace.ts;
// synthetic ones are hand-crafted traces for edge cases that are hard to find in the wild.
const fixtures = transferTraceFixtures as TransferTraceFixture[];

const TRANSFER_FROM_SIGNATURES = [
  'function transferFrom(address,address,uint256)',
  'function safeTransferFrom(address,address,uint256)',
  'function safeTransferFrom(address,address,uint256,bytes)',
  'function burnFrom(address,uint256)',
  'function pull(address,uint256)',
  'function move(address,address,uint256)',
  'function transferFromAndCall(address,address,uint256)',
  'function transferFromAndCall(address,address,uint256,bytes)',
];

const EIP3009_SIGNATURES = [
  'function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)',
  'function receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)',
  'function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,bytes)',
  'function receiveWithAuthorization(address,address,uint256,uint256,uint256,bytes32,bytes)',
];

const PERMIT2_ALLOWANCE_TRANSFER_SIGNATURES = [
  'function transferFrom(address,address,uint160,address)',
  'function transferFrom((address,address,uint160,address)[])',
];

const expectChecksummedOrUndefined = (address: string | undefined) => {
  if (address === undefined) return;
  expect(address).to.equal(getAddress(address), `expected checksummed address, got ${address}`);
};

describe('Transfer extraction', () => {
  describe('selector constants', () => {
    it('TRANSFER_FROM_SELECTORS match their documented signatures', () => {
      expect(TRANSFER_FROM_SELECTORS).to.deep.equal(TRANSFER_FROM_SIGNATURES.map(toFunctionSelector));
    });

    it('DIRECT_TRANSFER_SELECTOR matches transfer(address,uint256)', () => {
      expect(DIRECT_TRANSFER_SELECTOR).to.equal(toFunctionSelector('function transfer(address,uint256)'));
    });

    it('EIP3009_SELECTORS match their documented signatures', () => {
      expect(EIP3009_SELECTORS).to.deep.equal(EIP3009_SIGNATURES.map(toFunctionSelector));
    });

    it('PERMIT2_ALLOWANCE_TRANSFER_SELECTORS match their documented signatures', () => {
      expect(PERMIT2_ALLOWANCE_TRANSFER_SELECTORS).to.deep.equal(
        PERMIT2_ALLOWANCE_TRANSFER_SIGNATURES.map(toFunctionSelector),
      );
    });
  });

  describe('extractTransferDetails', () => {
    for (const fixture of fixtures) {
      it(fixture.name, () => {
        const results = extractTransferDetails(fixture.trace, fixture.transferLogs);

        expect(results.length, 'one result per stored transfer log').to.equal(fixture.transferLogs.length);
        expect(fixture.expected.length, 'fixture must assert every stored log').to.equal(fixture.transferLogs.length);

        const resultsByLogIndex = new Map(fixture.transferLogs.map((log, index) => [log.logIndex, results[index]]));

        for (const expected of fixture.expected) {
          const result = resultsByLogIndex.get(expected.logIndex);
          expect(result, `result for logIndex ${expected.logIndex}`).to.not.be.undefined;
          if (!result) continue;

          expect(result.classification, `logIndex ${expected.logIndex} classification`).to.equal(
            expected.classification,
          );

          const expectedSpender =
            expected.spenderAddress === undefined ? undefined : getAddress(expected.spenderAddress);
          expect(result.spenderAddress, `logIndex ${expected.logIndex} spenderAddress`).to.equal(expectedSpender);
          expectChecksummedOrUndefined(result.spenderAddress);

          const expectedPermit2Address =
            expected.permit2Address === undefined ? undefined : getAddress(expected.permit2Address);
          expect(result.permit2Address, `logIndex ${expected.logIndex} permit2Address`).to.equal(
            expectedPermit2Address,
          );
          expectChecksummedOrUndefined(result.permit2Address);

          expect(result.selector, `logIndex ${expected.logIndex} selector`).to.equal(expected.selector);

          if (expected.error !== undefined) {
            expect(result.error, `logIndex ${expected.logIndex} error`).to.equal(expected.error);
          }
        }
      });
    }
  });
});
