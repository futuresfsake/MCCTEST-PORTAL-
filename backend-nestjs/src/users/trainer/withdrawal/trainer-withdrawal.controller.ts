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
import { TrainerWithdrawalQueryDto } from '../../../withdrawal/dto/trainer-withdrawal-query.dto';
import { ValidateWithdrawalTrainerDto } from '../../../withdrawal/dto/validate-withdrawal-trainer.dto';
import { WithdrawalService } from '../../../withdrawal/withdrawal.service';

/**
 * Trainer side of the withdrawal pipeline: the first validation. Thin on
 * purpose. The trainer always comes from the JWT, a request is only reachable
 * when it belongs to one of the trainer's batches, and the rules live in
 * WithdrawalService.
 */
@Controller('trainer/withdrawal-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
export class TrainerWithdrawalController {
  constructor(private readonly withdrawalService: WithdrawalService) {}

  /** GET /api/trainer/withdrawal-requests */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TrainerWithdrawalQueryDto,
  ) {
    return this.withdrawalService.listForTrainer(user.id, query);
  }

  /** GET /api/trainer/withdrawal-requests/:id */
  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.withdrawalService.getForTrainer(user.id, id);
  }

  /** PATCH /api/trainer/withdrawal-requests/:id/validate */
  @Patch(':id/validate')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ValidateWithdrawalTrainerDto,
  ) {
    return this.withdrawalService.validateByTrainer(user.id, id, dto);
  }
}
