import { Controller, Get, UseGuards } from '@nestjs/common';
import { TrainerService } from './trainer.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('trainer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get('dashboard')
  getDashboard() {
    return this.trainerService.getDashboardData();
  }
}
