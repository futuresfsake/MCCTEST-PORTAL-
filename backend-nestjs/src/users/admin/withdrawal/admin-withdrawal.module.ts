import { Module } from '@nestjs/common';
import { WithdrawalModule } from '../../../withdrawal/withdrawal.module';
import { AdminWithdrawalController } from './admin-withdrawal.controller';

@Module({
  imports: [WithdrawalModule],
  controllers: [AdminWithdrawalController],
})
export class AdminWithdrawalModule {}
