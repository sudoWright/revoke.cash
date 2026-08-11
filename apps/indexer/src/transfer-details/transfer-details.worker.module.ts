import { Module } from '@nestjs/common';
import { TRANSFER_DETAILS_QUEUE_NAME } from '@revoke.cash/backend/indexer/queues/transfer-details';
import { QueueModule } from '@revoke.cash/backend/queue/queue.module';
import { TransferDetailsWorker } from './transfer-details.worker';

@Module({
  imports: [
    // minTime is set to 200ms to budget max 5 trace starts per second per provider (e.g. Alchemy). This is
    // so that traces cannot use up the entire throughput budget of a provider.
    QueueModule.register({
      name: TRANSFER_DETAILS_QUEUE_NAME,
      limiter: { groupId: 'indexer-transfer-details-trace', maxConcurrent: 50, overflow: 'delay', minTime: 200 },
    }),
  ],
  providers: [TransferDetailsWorker],
})
export class TransferDetailsWorkerModule {}
