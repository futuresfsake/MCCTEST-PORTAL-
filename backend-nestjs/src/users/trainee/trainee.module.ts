import { Module } from '@nestjs/common';
import { DashboardModule } from './dashboard/dashboard.module';
import { TraineeWithdrawalModule } from './withdrawal/trainee-withdrawal.module';
import { ProfileController } from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule, DashboardModule, TraineeWithdrawalModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class TraineeModule {}
