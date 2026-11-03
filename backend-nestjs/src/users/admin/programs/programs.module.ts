import { Module } from '@nestjs/common';
import { ProgramsController } from './programs.controller';
import { ProgramsService } from './programs.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { InventoryModule } from '../../../inventory/inventory.module';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [ProgramsController],
  providers: [ProgramsService],
})
export class ProgramsModule {}
