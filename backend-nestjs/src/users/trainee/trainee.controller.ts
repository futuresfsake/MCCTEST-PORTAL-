import { Controller, Get, UseGuards } from '@nestjs/common';
import { TraineeService } from './trainee.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('trainee')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINEE)
export class TraineeController {
  constructor(private readonly traineeService: TraineeService) {}

  @Get('dashboard')
  getDashboard() {
    return this.traineeService.getDashboardData();
  }
}
