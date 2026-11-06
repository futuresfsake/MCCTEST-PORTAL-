import { Module } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { RequirementsModule } from '../requirements/requirements.module';

@Module({
  imports: [PrismaModule, InventoryModule, RequirementsModule],
  providers: [EnrollmentsService],
  exports: [EnrollmentsService],
})
export class EnrollmentsModule {}
