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
import { RegistrarWithdrawalQueryDto } from '../../../withdrawal/dto/registrar-withdrawal-query.dto';
import { ValidateWithdrawalRegistrarDto } from '../../../withdrawal/dto/validate-withdrawal-registrar.dto';
import { WithdrawalService } from '../../../withdrawal/withdrawal.service';

/**
 * Registrar side of the withdrawal pipeline: the second validation, after the
 * trainer. Thin on purpose. The registrar always comes from the JWT, sees every
 * request (not scoped to a batch), and the rules live in WithdrawalService.
 */
@Controller('registrar/withdrawal-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR)
export class RegistrarWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /** GET /api/registrar/withdrawal-requests */
  @Get()
  list(@Query() query: RegistrarWithdrawalQueryDto) {
    return this.withdrawalService.listForRegistrar(query);
  }

  /** GET /api/registrar/withdrawal-requests/filter-options (declared before :id) */
  @Get('filter-options')
  filterOptions() {
    return this.withdrawalService.getRegistrarFilterOptions();
  }

  /** GET /api/registrar/withdrawal-requests/:id */
  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.withdrawalService.getForRegistrar(id);
  }

  /** PATCH /api/registrar/withdrawal-requests/:id/validate */
  @Patch(':id/validate')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateWithdrawalRegistrarDto,
  ) {
    return this.withdrawalService.validateByRegistrar(user.id, id, dto);
  }
}
