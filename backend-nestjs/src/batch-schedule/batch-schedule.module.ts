import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BatchScheduleService } from './batch-schedule.service';

/**
 * Shared batch date rules, used by the trainer class pages and by the
 * Registrar and Admin batch endpoints.
 */
@Module({
  imports: [PrismaModule],
  providers: [BatchScheduleService],
  exports: [BatchScheduleService],
})
export class BatchScheduleModule {}
