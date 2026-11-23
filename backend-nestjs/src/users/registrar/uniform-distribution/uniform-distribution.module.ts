import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { InventoryModule } from '../../../inventory/inventory.module';
import { UniformDistributionController } from './uniform-distribution.controller';
import { UniformDistributionService } from './uniform-distribution.service';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [UniformDistributionController],
  providers: [UniformDistributionService],
})
export class UniformDistributionModule {}
