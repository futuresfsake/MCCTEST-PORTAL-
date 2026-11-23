import { Module } from '@nestjs/common';
import { TrainerController } from './trainer.controller';
import { TrainerService } from './trainer.service';
import { TrainerAttendanceModule } from './attendance/attendance.module';

@Module({
  imports: [TrainerAttendanceModule],
  controllers: [TrainerController],
  providers: [TrainerService],
})
export class TrainerModule {}
