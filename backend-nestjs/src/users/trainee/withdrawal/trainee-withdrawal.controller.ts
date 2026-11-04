import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { CreateWithdrawalDto } from '../../../withdrawal/dto/create-withdrawal.dto';
import { WithdrawalQueryDto } from '../../../withdrawal/dto/withdrawal-query.dto';
import { WithdrawalService } from '../../../withdrawal/withdrawal.service';

/**
 * Trainee side of the withdrawal pipeline. Thin on purpose: the trainee always
 * comes from the JWT, never from the request, and the rules live in
 * WithdrawalService.
 */
@Controller('trainee/withdrawal-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINEE)
export class TraineeWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /** POST /api/trainee/withdrawal-requests */
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWithdrawalDto,
  ) {
    return this.withdrawalService.createForTrainee(user.id, dto);
  }

  /** GET /api/trainee/withdrawal-requests */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WithdrawalQueryDto,
  ) {
    return this.withdrawalService.listForTrainee(user.id, query);
  }

  /** GET /api/trainee/withdrawal-requests/:id */
  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.withdrawalService.getForTrainee(user.id, id);
  }

  /** PATCH /api/trainee/withdrawal-requests/:id/cancel */
  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.withdrawalService.cancelForTrainee(user.id, id);
  }
}
