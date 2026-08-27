import { Module } from '@nestjs/common';
import { TraineeController } from './trainee.controller';
import { TraineeService } from './trainee.service';

@Module({
  controllers: [TraineeController],
  providers: [TraineeService],
})
export class TraineeModule {}
