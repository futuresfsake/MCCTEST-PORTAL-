import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WithdrawalService } from './withdrawal.service';

/**
 * Shared withdrawal logic. Each role (trainee, trainer, registrar, admin) has a
 * thin controller in its own folder that imports this module and calls the
 * service, the same pattern as `enrollments/`.
 */
@Module({
  imports: [PrismaModule],
  providers: [WithdrawalService],
  exports: [WithdrawalService],
})
export class WithdrawalModule {}
