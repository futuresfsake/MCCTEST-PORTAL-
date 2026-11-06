import { Module } from '@nestjs/common';
import { RegistrarController } from './registrar.controller';
import { RegistrarService } from './registrar.service';
import { EnrollmentsController } from './enrollments/enrollments.controller';
import { RegistrarTraineesController } from './trainees/trainees.controller';
import { RequirementsController } from './requirements/requirements.controller';
import { RequirementsService } from './requirements/requirements.service';
import { EnrollmentsModule } from '../../enrollments/enrollments.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { TraineeInformationModule } from '../../trainee-information/trainee-information.module';

@Module({
  imports: [PrismaModule, EnrollmentsModule, TraineeInformationModule],
  // RegistrarTraineesController stays after EnrollmentsController so
  // GET trainees/search is matched before GET trainees/:id.
  controllers: [
    RegistrarController,
    EnrollmentsController,
    RegistrarTraineesController,
    RequirementsController,
  ],
  providers: [RegistrarService, RequirementsService],
})
export class RegistrarModule {}
