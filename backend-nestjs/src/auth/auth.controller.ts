import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { LoginDto, CreateAccountDto } from './auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('auth')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Public — no JWT required.
   * Body: { systemId: "MCCTP-26-001", password: "..." }
   * Returns: { accessToken, sessionToken, user }
   *
   * Frontend stores:
   *   - accessToken  → memory / short-lived storage
   *   - sessionToken → sent as X-Session-Token header on every request
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /auth/logout
   * Requires: X-Session-Token header.
   * Deletes the session from DB — stateful logout.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Headers('x-session-token') sessionToken: string) {
    return this.authService.logout(sessionToken);
  }

  /**
   * GET /auth/me
   * Returns the full profile of the currently authenticated user.
   */
  @Get('me')
  async getMe(@CurrentUser() user: { id: string }) {
    return this.authService.getMe(user.id);
  }

  /**
   * POST /auth/create-account
   * Admin only.
   * Body: { firstName, lastName, middleName, role, password }
   * Returns: { systemId, userId }
   *
   * The system_id is auto-generated (MCCTP-YY-SEQ).
   * The admin shares the generated systemId + password with the new user.
   */
  @Post('create-account')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async createAccount(
    @Body() dto: CreateAccountDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.authService.createAccount(dto, admin.id);
  }
}
