import { Module } from '@nestjs/common';
import { TraineeInformationModule } from '../../../trainee-information/trainee-information.module';
import { TrainerTraineesController } from './trainees.controller';

@Module({
  imports: [TraineeInformationModule],
  controllers: [TrainerTraineesController],
})
export class TrainerTraineesModule {}
