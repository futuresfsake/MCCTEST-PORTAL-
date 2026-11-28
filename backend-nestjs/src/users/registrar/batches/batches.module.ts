import { Module } from '@nestjs/common';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BatchScheduleModule } from '../../../batch-schedule/batch-schedule.module';

@Module({
  imports: [PrismaModule, BatchScheduleModule],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
