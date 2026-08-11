import { findUnclassifiedTransferTransactions } from '@revoke.cash/core/indexer/transfer-details';
import { MINUTE } from '@revoke.cash/core/utils/time';
import type { Address, Hash } from 'viem';

export interface TransferDetailsJobData {
  chainId: number;
  transactionHash: Hash;
  source: 'events' | 'scheduler';
}

interface TransferDetailsQueue {
  addBulk(
    jobs: Array<{
      name: string;
      data: TransferDetailsJobData;
      opts: { jobId: string; attempts: number; backoff: { type: 'exponential'; delay: number } };
    }>,
  ): Promise<unknown>;
}

export const TRANSFER_DETAILS_QUEUE_NAME = 'indexer_transfer_details';

export const transferDetailsJobId = (chainId: number, transactionHash: Hash): string =>
  `classify-transfers-${chainId}-${transactionHash.toLowerCase()}`;

const TRACE_JOB_OPTIONS = { attempts: 5, backoff: { type: 'exponential' as const, delay: 2 * MINUTE } };

export const enqueueUnclassifiedTransferTransactions = async (
  queue: TransferDetailsQueue,
  chainId: number,
  source: TransferDetailsJobData['source'],
  ownerAddress?: Address,
): Promise<number> => {
  const transactionHashes = await findUnclassifiedTransferTransactions(chainId, { ownerAddress, limit: 5000 });
  if (transactionHashes.length === 0) return 0;

  await queue.addBulk(
    transactionHashes.map((transactionHash) => ({
      name: 'classify',
      data: { chainId, transactionHash, source },
      opts: { jobId: transferDetailsJobId(chainId, transactionHash), ...TRACE_JOB_OPTIONS },
    })),
  );

  return transactionHashes.length;
};
