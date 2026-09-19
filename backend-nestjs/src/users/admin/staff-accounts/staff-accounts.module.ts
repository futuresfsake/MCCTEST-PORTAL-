// staff-accounts.module.ts

import { Module } from '@nestjs/common';
import { StaffAccountsController } from './staff-accounts.controller';
import { StaffAccountsService } from './staff-accounts.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaffAccountsController],
  providers: [StaffAccountsService],
})
export class StaffAccountsModule {}
