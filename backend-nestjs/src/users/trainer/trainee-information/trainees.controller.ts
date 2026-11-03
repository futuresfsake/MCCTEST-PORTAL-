import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { TraineeListQueryDto } from '../../../trainee-information/dto/trainee-list-query.dto';
import { TraineeInformationService } from '../../../trainee-information/trainee-information.service';

/**
 * Read-only Trainee Information for trainers (MP-24). A trainer only sees
 * trainees enrolled in batches assigned to them.
 */
@Controller('trainer/trainees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class TrainerTraineesController {
  constructor(
    private readonly traineeInformationService: TraineeInformationService,
  ) {}

  /** GET /api/trainer/trainees */
  @Get()
  findAll(
    @Query() query: TraineeListQueryDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    // Trainers don't filter by insurance, even if the parameter is sent.
    query.insurance = undefined;
    return this.traineeInformationService.listTrainees(query, {
      trainerUserId: req.user.id,
    });
  }

  /** GET /api/trainer/trainees/filter-options */
  @Get('filter-options')
  getFilterOptions(@Req() req: { user: AuthenticatedUser }) {
    return this.traineeInformationService.getFilterOptions({
      trainerUserId: req.user.id,
    });
  }

  /** GET /api/trainer/trainees/:id */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.traineeInformationService.getTraineeProfile(id, {
      trainerUserId: req.user.id,
    });
  }
}
