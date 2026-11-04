import { Module } from '@nestjs/common';
import { WithdrawalModule } from '../../../withdrawal/withdrawal.module';
import { TraineeWithdrawalController } from './trainee-withdrawal.controller';

@Module({
  imports: [WithdrawalModule],
  controllers: [TraineeWithdrawalController],
})
export class TraineeWithdrawalModule {}
