import { Module } from '@nestjs/common';
import { EnrollmentsModule } from '../../../enrollments/enrollments.module';
import { TraineeInformationModule } from '../../../trainee-information/trainee-information.module';
import { AdminTraineesController } from './trainees.controller';

@Module({
  imports: [TraineeInformationModule, EnrollmentsModule],
  controllers: [AdminTraineesController],
})
export class AdminTraineesModule {}
