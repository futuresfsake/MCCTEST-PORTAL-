import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { AuthModule } from './auth/auth.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// * --- MODULES --- *
import { ChatbotModule } from './chatbot/chatbot.module';
import { ProgramsModule } from './users/admin/programs/programs.module';
import { StaffAccountsModule } from './users/admin/staff-accounts/staff-accounts.module';
import { BatchesModule } from './users/registrar/batches/batches.module';
import { RegistrarModule } from './users/registrar/registrar.module';
import { AdminBatchesModule } from './users/admin/batches/batches.module';
import { AdminEnrollmentsModule } from './users/admin/enrollments/enrollments.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminTraineesModule } from './users/admin/trainee-information/trainees.module';
import { TraineeModule } from './users/trainee/trainee.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Per IP: 120 requests a minute for normal use (staff in one office share
    // an IP). Login has its own stricter limit in AuthController.
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 120,
      },
    ]),

    // Global: provides the single shared PrismaService (one connection pool)
    PrismaModule,
    AuthModule,
    ChatbotModule,
    ProgramsModule,
    StaffAccountsModule,
    BatchesModule,
    RegistrarModule,
    AdminBatchesModule,
    AdminEnrollmentsModule,
    AnnouncementsModule,
    PaymentsModule,
    AdminTraineesModule,
    TraineeModule,
  ],

  controllers: [SessionsController, AppController],

  providers: [
    AppService,
    SessionsService,

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
