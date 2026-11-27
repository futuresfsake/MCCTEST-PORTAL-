import { Module } from '@nestjs/common';
import { ClearanceModule } from '../../../clearance/clearance.module';
import { TraineeClearanceController } from './trainee-clearance.controller';

@Module({
  imports: [ClearanceModule],
  controllers: [TraineeClearanceController],
})
export class TraineeClearanceModule {}
