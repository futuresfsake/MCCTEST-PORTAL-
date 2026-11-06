import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RequirementsService } from './requirements.service';
import { RegistrarRequirementsController } from '../users/registrar/requirements/registrar-requirements.controller';

@Module({
  imports: [PrismaModule],
  controllers: [RegistrarRequirementsController],
  providers: [RequirementsService],
  exports: [RequirementsService],
})
export class RequirementsModule {}
