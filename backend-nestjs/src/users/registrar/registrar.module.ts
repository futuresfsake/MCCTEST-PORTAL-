import { Module } from '@nestjs/common';
import { RegistrarController } from './registrar.controller';
import { RegistrarService } from './registrar.service';

@Module({
  controllers: [RegistrarController],
  providers: [RegistrarService],
})
export class RegistrarModule {}
