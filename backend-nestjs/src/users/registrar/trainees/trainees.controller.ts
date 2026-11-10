import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { EnrollmentsService } from '../../../enrollments/enrollments.service';
import { TraineeListQueryDto } from '../../../trainee-information/dto/trainee-list-query.dto';
import { TraineeInformationService } from '../../../trainee-information/trainee-information.service';

/**
 * Read-only Trainee Information for registrars.
 * Registered after EnrollmentsController so its GET trainees/search keeps
 * matching before trainees/:id here.
 */
@Controller('registrar/trainees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR)
// Search-as-you-type and paging need headroom; matches the global limit.
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class RegistrarTraineesController {
  constructor(
    private readonly traineeInformationService: TraineeInformationService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  /** GET /api/registrar/trainees */
  @Get()
  findAll(@Query() query: TraineeListQueryDto) {
    return this.traineeInformationService.listTrainees(query);
  }

  /** GET /api/registrar/trainees/filter-options */
  @Get('filter-options')
  getFilterOptions() {
    return this.traineeInformationService.getFilterOptions();
  }

  /** GET /api/registrar/trainees/:id */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.traineeInformationService.getTraineeProfile(id);
  }

  /** GET /api/registrar/trainees/:traineeId/change-history (read-only) */
  @Get(':traineeId/change-history')
  getChangeHistory(@Param('traineeId', ParseUUIDPipe) traineeId: string) {
    return this.enrollmentsService.getTraineeChangeHistory(traineeId);
  }
}
