import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service'
import { AuthModule } from './auth/auth.module';
import { StaffAccountsModule } from './users/admin/staff-accounts/staff-accounts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),AuthModule, StaffAccountsModule],
  controllers: [SessionsController, AppController],
  providers: [AppService, PrismaService, SessionsService],
})
export class AppModule {}
