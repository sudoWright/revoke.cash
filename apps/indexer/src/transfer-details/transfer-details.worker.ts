import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  TRANSFER_DETAILS_QUEUE_NAME,
  type TransferDetailsJobData,
} from '@revoke.cash/backend/indexer/queues/transfer-details';
import { GroupLimiterService } from '@revoke.cash/backend/queue/group-limiter.service';
import {
  classifyTransaction,
  recordExhaustedTransaction,
  traceLimiterKeyForChain,
} from '@revoke.cash/core/indexer/transfer-details';
import { isApprovedTransfersSupportedChain } from '@revoke.cash/core/transfers/config';
import { parseErrorMessage } from '@revoke.cash/core/utils/errors';
import type { Job } from 'bullmq';

@Processor(TRANSFER_DETAILS_QUEUE_NAME, { concurrency: 50, lockDuration: 90_000 })
export class TransferDetailsWorker extends WorkerHost {
  private readonly logger = new Logger(TransferDetailsWorker.name);

  constructor(private readonly groupLimiter: GroupLimiterService) {
    super();
  }

  async process(job: Job<TransferDetailsJobData>, token?: string): Promise<void> {
    const { chainId, transactionHash, source } = job.data;
    if (!isApprovedTransfersSupportedChain(chainId)) return;

    const result = await classifyTransaction(chainId, transactionHash, (work) =>
      this.groupLimiter.runWithLimit(traceLimiterKeyForChain(chainId), work, { job, token }),
    );

    if (result.rowsClassified === 0 && result.rowsSkipped === 0) return;

    this.logger.debug({ event: 'transfer_classification_completed', outcome: 'ok', source, ...result });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<TransferDetailsJobData> | undefined, error: Error): Promise<void> {
    const attempt = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? 1;
    const exhausted = attempt >= maxAttempts;

    this.logger.error({
      event: 'transfer_classification_failed',
      outcome: exhausted ? 'failed' : 'retrying',
      jobId: job?.id,
      chainId: job?.data?.chainId,
      transactionHash: job?.data?.transactionHash,
      attempt,
      maxAttempts,
      error: parseErrorMessage(error),
    });

    // Exhausted transactions converge to soft-terminal 'unknown' so they leave the work-list; the error
    // is preserved on the rows for later re-sweeps.
    if (exhausted && job) {
      await recordExhaustedTransaction(job.data.chainId, job.data.transactionHash, parseErrorMessage(error)).catch(
        (recordError) => {
          this.logger.error({
            event: 'transfer_exhaustion_record_failed',
            outcome: 'failed',
            chainId: job.data.chainId,
            transactionHash: job.data.transactionHash,
            error: parseErrorMessage(recordError),
          });
        },
      );
    }
  }
}
