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
import { ClearanceService } from '../../../clearance/clearance.service';
import { ClearanceQueryDto } from '../../../clearance/dto/clearance-query.dto';
import { CreateClearanceRequestDto } from '../../../clearance/dto/create-clearance-request.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

/**
 * Trainee side of the clearance pipeline. Thin on purpose: the trainee always
 * comes from the JWT, never from the request, and the rules live in
 * ClearanceService.
 */
@Controller('trainee/clearance-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINEE)
export class TraineeClearanceController {
  constructor(private readonly clearanceService: ClearanceService) {}

  /** POST /api/trainee/clearance-requests */
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateClearanceRequestDto,
  ) {
    return this.clearanceService.createForTrainee(user.id, dto);
  }

  /** GET /api/trainee/clearance-requests */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ClearanceQueryDto,
  ) {
    return this.clearanceService.listForTrainee(user.id, query);
  }

  /** GET /api/trainee/clearance-requests/form-options (declared before :id). */
  @Get('form-options')
  formOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.clearanceService.getFormOptionsForTrainee(user.id);
  }

  /** GET /api/trainee/clearance-requests/:id */
  @Get(':id')
  getOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clearanceService.getForTrainee(user.id, id);
  }

  /** PATCH /api/trainee/clearance-requests/:id/cancel */
  @Patch(':id/cancel')
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clearanceService.cancelForTrainee(user.id, id);
  }
}
