import { Controller, Get } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions') // Creates the base route /sessions
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get('expires') // Extends route to /sessions/expires
  getExpirations() {
    return this.sessionsService.getExpirations();
  }
}