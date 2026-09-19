import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { StaffAccountsModule } from './staff-accounts/staff-accounts.module';
console.log('AdminModule loaded');
@Module({
  imports: [StaffAccountsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
