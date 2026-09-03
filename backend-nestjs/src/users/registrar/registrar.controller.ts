import { Controller, Get, UseGuards } from '@nestjs/common';
import { RegistrarService } from './registrar.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('registrar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR)
export class RegistrarController {
  constructor(private readonly registrarService: RegistrarService) {}

  @Get('dashboard')
  getDashboard() {
    return this.registrarService.getDashboardData();
  }
}
