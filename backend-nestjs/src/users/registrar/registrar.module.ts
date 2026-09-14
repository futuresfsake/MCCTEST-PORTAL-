import { Module } from '@nestjs/common';
import { RegistrarController } from './registrar.controller';
import { RegistrarService } from './registrar.service';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EnrollmentsModule],
  controllers: [RegistrarController],
  providers: [RegistrarService],
})
export class RegistrarModule {}
