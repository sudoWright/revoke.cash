import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  enqueueUnclassifiedTransferTransactions,
  TRANSFER_DETAILS_QUEUE_NAME,
  type TransferDetailsJobData,
} from '@revoke.cash/backend/indexer/queues/transfer-details';
import { ORDERED_CHAINS } from '@revoke.cash/core/chains';
import { resweepFailedTraces } from '@revoke.cash/core/indexer/transfer-details';
import { isApprovedTransfersSupportedChain } from '@revoke.cash/core/transfers/config';
import { parseErrorMessage } from '@revoke.cash/core/utils/errors';
import { mapAsyncSequential } from '@revoke.cash/core/utils/promises';
import { MINUTE } from '@revoke.cash/core/utils/time';
import type { Queue } from 'bullmq';

const TICK_INTERVAL_MS = 10 * MINUTE;

@Injectable()
export class TransferDetailsSchedulerService {
  private readonly logger = new Logger(TransferDetailsSchedulerService.name);

  constructor(@InjectQueue(TRANSFER_DETAILS_QUEUE_NAME) private readonly queue: Queue<TransferDetailsJobData>) {}

  @Interval(TICK_INTERVAL_MS)
  async tick(): Promise<void> {
    let enqueued = 0;

    await mapAsyncSequential([...ORDERED_CHAINS], async (chainId) => {
      if (!isApprovedTransfersSupportedChain(chainId)) return;

      try {
        const reswept = await resweepFailedTraces(chainId);
        if (reswept > 0) {
          this.logger.log({ event: 'transfer_details_resweep_completed', outcome: 'ok', chainId, reswept });
        }

        enqueued += await enqueueUnclassifiedTransferTransactions(this.queue, chainId, 'scheduler');
      } catch (error) {
        this.logger.warn({
          event: 'transfer_details_enqueue_failed',
          outcome: 'failed',
          chainId,
          error: parseErrorMessage(error),
        });
      }
    });

    this.logger.debug({ event: 'transfer_details_scheduler_tick_completed', outcome: 'completed', enqueued });
  }
}
