import { Module } from '@nestjs/common';
import { TraineeInformationModule } from '../../../trainee-information/trainee-information.module';
import { EncoderTraineesController } from './trainees.controller';

@Module({
  imports: [TraineeInformationModule],
  controllers: [EncoderTraineesController],
})
export class EncoderTraineesModule {}
