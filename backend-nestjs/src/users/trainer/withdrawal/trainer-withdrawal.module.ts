import { Module } from '@nestjs/common';
import { WithdrawalModule } from '../../../withdrawal/withdrawal.module';
import { TrainerWithdrawalController } from './trainer-withdrawal.controller';

@Module({
  imports: [WithdrawalModule],
  controllers: [TrainerWithdrawalController],
})
export class TrainerWithdrawalModule {}
