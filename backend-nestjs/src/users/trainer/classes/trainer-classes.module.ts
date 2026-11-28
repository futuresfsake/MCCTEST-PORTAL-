import { Module } from '@nestjs/common';
import { BatchScheduleModule } from '../../../batch-schedule/batch-schedule.module';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TrainerClassesController } from './trainer-classes.controller';
import { TrainerClassesService } from './trainer-classes.service';

@Module({
  imports: [PrismaModule, BatchScheduleModule],
  controllers: [TrainerClassesController],
  providers: [TrainerClassesService],
})
export class TrainerClassesModule {}
