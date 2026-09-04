import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { RegistrarModule } from './registrar/registrar.module';
import { TrainerModule } from './trainer/trainer.module';
import { TraineeModule } from './trainee/trainee.module';
import { EncoderModule } from './encoder/encoder.module';

/**
 * UsersModule is the parent that bundles all role-specific modules.
 * Each role module owns its own controller, service, and sub-modules.
 */
@Module({
  imports: [
    AdminModule,
    RegistrarModule,
    TrainerModule,
    TraineeModule,
    EncoderModule,
  ],
})
export class UsersModule {}
