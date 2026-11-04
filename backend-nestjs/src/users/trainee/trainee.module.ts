import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { TraineeWithdrawalModule } from './withdrawal/trainee-withdrawal.module';

@Module({
  imports: [DashboardModule, TraineeWithdrawalModule],
})
export class TraineeModule {}
