import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { AuthModule } from './auth/auth.module';
import { StaffAccountsModule } from './users/admin/staff-accounts/staff-accounts.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ProgramsModule } from './users/admin/programs/programs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 15,
      },
    ]),

    AuthModule,
    ChatbotModule,
    ProgramsModule,
    StaffAccountsModule,
  ],

  controllers: [
    SessionsController,
    AppController,
  ],

  providers: [
    AppService,
    PrismaService,
    SessionsService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}