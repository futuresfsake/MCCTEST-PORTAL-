import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { AdminSignoffDto } from '../../../withdrawal/dto/admin-signoff.dto';
import { AdminWithdrawalQueryDto } from '../../../withdrawal/dto/admin-withdrawal-query.dto';
import { WithdrawalService } from '../../../withdrawal/withdrawal.service';

/**
 * Admin side of the withdrawal pipeline: the final sign-off, after the trainer
 * and then the registrar. Thin on purpose. The admin always comes from the JWT,
 * sees every request (not scoped to a batch), and the rules live in
 * WithdrawalService.
 */
@Controller('admin/withdrawal-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /** GET /api/admin/withdrawal-requests */
  @Get()
  list(@Query() query: AdminWithdrawalQueryDto) {
    return this.withdrawalService.listForAdmin(query);
  }

  /** GET /api/admin/withdrawal-requests/filter-options (declared before :id) */
  @Get('filter-options')
  filterOptions() {
    return this.withdrawalService.getAdminFilterOptions();
  }

  /** GET /api/admin/withdrawal-requests/:id */
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalService.getForAdmin(id);
  }

  /** PATCH /api/admin/withdrawal-requests/:id/sign-off */
  @Patch(':id/sign-off')
  signOff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminSignoffDto,
  ) {
    return this.withdrawalService.signOffByAdmin(user.id, id, dto);
  }
}
