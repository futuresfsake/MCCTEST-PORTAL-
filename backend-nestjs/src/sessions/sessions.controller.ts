import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { SessionsService } from './sessions.service';

@Controller('sessions') // Creates the base route /sessions
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('expires') // Extends route to /sessions/expires
  getExpirations() {
    return this.sessionsService.getExpirations();
  }
}
