import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { StaffAccountsService } from './staff-accounts.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Role } from '../../../common/enums/role.enum';
import { user_role_enum } from '../../../generated/prisma/client';

@Controller('admin/staff-accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class StaffAccountsController {
  constructor(private readonly staffAccountsService: StaffAccountsService) {}

  /**
   * GET /api/admin/staff-accounts
   * Query params:
   *   - role: REGISTRAR | TRAINER | ENCODER
   *   - isActive: true | false
   *
   * Examples:
   *   GET /api/admin/staff-accounts
   *   GET /api/admin/staff-accounts?role=TRAINER
   *   GET /api/admin/staff-accounts?isActive=false
   *   GET /api/admin/staff-accounts?role=REGISTRAR&isActive=true
   */
  @Get()
  findAll(
    @Query('role') role?: user_role_enum,
    @Query('isActive') isActive?: string,
  ) {
    const parsedIsActive =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    return this.staffAccountsService.findAll({
      role,
      isActive: parsedIsActive,
    });
  }

  /**
   * GET /api/admin/staff-accounts/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffAccountsService.findOne(id);
  }

  /**
   * POST /api/admin/staff-accounts
   * Body: { firstName, lastName, middleName, email, role, password }
   *
   * Creates a Supabase Auth user then inserts a row in our users table.
   * Returns the new staff member's system_id and email for the admin to share.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateStaffDto,
    @CurrentUser() admin: { id: string },
  ) {
    return this.staffAccountsService.create(dto, admin.id);
  }

  /**
   * PATCH /api/admin/staff-accounts/:id
   * Body: { firstName?, lastName?, middleName? }
   *
   * Updates non-auth profile fields only.
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffAccountsService.update(id, dto);
  }

  /**
   * PATCH /api/admin/staff-accounts/:id/status
   * Body: { isActive: boolean }
   *
   * Deactivates or reactivates a staff account.
   * Deactivated users cannot log in (blocked at JWT validation + Supabase ban).
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.staffAccountsService.setStatus(id, isActive);
  }

  /**
   * POST /api/admin/staff-accounts/:id/reset-password
   *
   * Triggers a Supabase password reset email for the staff member.
   */
  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.staffAccountsService.triggerPasswordReset(id);
  }
}
