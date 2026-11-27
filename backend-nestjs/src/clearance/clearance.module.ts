import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClearanceService } from './clearance.service';

/**
 * Shared clearance and certificate request logic. Each role has a thin
 * controller in its own folder that imports this module, the same pattern as
 * `withdrawal/`.
 */
@Module({
  imports: [PrismaModule],
  providers: [ClearanceService],
  exports: [ClearanceService],
})
export class ClearanceModule {}
