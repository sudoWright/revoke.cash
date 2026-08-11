import { Module } from '@nestjs/common';
import { TRANSFER_DETAILS_QUEUE_NAME } from '@revoke.cash/backend/indexer/queues/transfer-details';
import { QueueModule } from '@revoke.cash/backend/queue/queue.module';
import { TransferDetailsSchedulerService } from './transfer-details.scheduler.service';

@Module({
  imports: [QueueModule.register({ name: TRANSFER_DETAILS_QUEUE_NAME })],
  providers: [TransferDetailsSchedulerService],
})
export class TransferDetailsSchedulerModule {}
