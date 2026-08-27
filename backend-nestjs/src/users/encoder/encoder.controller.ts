import { Controller, Get, UseGuards } from '@nestjs/common';
import { EncoderService } from './encoder.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('encoder')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ENCODER)
export class EncoderController {
  constructor(private readonly encoderService: EncoderService) {}

  @Get('dashboard')
  getDashboard() {
    return this.encoderService.getDashboardData();
  }
}
