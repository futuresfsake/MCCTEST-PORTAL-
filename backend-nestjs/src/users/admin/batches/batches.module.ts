import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BatchesModule } from '../../registrar/batches/batches.module';
import { AdminBatchesController } from './batches.controller';

@Module({
  imports: [PrismaModule, BatchesModule],
  controllers: [AdminBatchesController],
})
export class AdminBatchesModule {}
