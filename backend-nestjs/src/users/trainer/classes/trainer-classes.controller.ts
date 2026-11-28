import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import {
  ClassListQueryDto,
  CloseClassDto,
  DateCheckQueryDto,
  SetEndDateDto,
  SetStartDateDto,
  StartClassDto,
} from './dto/class-management.dto';
import { TrainerClassesService } from './trainer-classes.service';

/** Class Management. Every route acts only on the logged-in trainer's batches. */
@Controller('trainer/classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
export class TrainerClassesController {
  constructor(private readonly classes: TrainerClassesService) {}

  /** GET /api/trainer/classes?status=&page=&limit= */
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ClassListQueryDto,
  ) {
    return this.classes.list(user.id, query);
  }

  /** GET /api/trainer/classes/:batchId */
  @Get(':batchId')
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.classes.detail(user.id, batchId);
  }

  /** GET /api/trainer/classes/:batchId/date-check?startDate=&endDate= */
  @Get(':batchId/date-check')
  dateCheck(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Query() query: DateCheckQueryDto,
  ) {
    return this.classes.dateCheck(
      user.id,
      batchId,
      query.startDate,
      query.endDate,
    );
  }

  /** POST /api/trainer/classes/:batchId/start-date */
  @Post(':batchId/start-date')
  setStartDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: SetStartDateDto,
  ) {
    return this.classes.setStartDate(user.id, batchId, dto);
  }

  /** POST /api/trainer/classes/:batchId/start */
  @Post(':batchId/start')
  start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: StartClassDto,
  ) {
    return this.classes.start(user.id, batchId, dto);
  }

  /** POST /api/trainer/classes/:batchId/end-date */
  @Post(':batchId/end-date')
  setEndDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: SetEndDateDto,
  ) {
    return this.classes.setEndDate(user.id, batchId, dto);
  }

  /** POST /api/trainer/classes/:batchId/close */
  @Post(':batchId/close')
  close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: CloseClassDto,
  ) {
    return this.classes.close(user.id, batchId, dto);
  }
}
