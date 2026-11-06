import { Module } from '@nestjs/common';
import { WithdrawalModule } from '../../../withdrawal/withdrawal.module';
import { RegistrarWithdrawalController } from './registrar-withdrawal.controller';

@Module({
  imports: [WithdrawalModule],
  controllers: [RegistrarWithdrawalController],
})
export class RegistrarWithdrawalModule {}
