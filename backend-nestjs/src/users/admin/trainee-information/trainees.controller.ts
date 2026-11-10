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
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { UpdateTraineeDto } from '../../../enrollments/dto/update-trainee.dto';
import { EnrollmentsService } from '../../../enrollments/enrollments.service';
import { TraineeListQueryDto } from '../../../trainee-information/dto/trainee-list-query.dto';
import { TraineeInformationService } from '../../../trainee-information/trainee-information.service';

/** Trainee Information for admins: the shared read-only views, plus editing. */
@Controller('admin/trainees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
// Search-as-you-type and paging need headroom; matches the global limit.
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class AdminTraineesController {
  constructor(
    private readonly traineeInformationService: TraineeInformationService,
    private readonly enrollmentsService: EnrollmentsService,
  ) {}

  /** GET /api/admin/trainees */
  @Get()
  findAll(@Query() query: TraineeListQueryDto) {
    return this.traineeInformationService.listTrainees(query);
  }

  /** GET /api/admin/trainees/filter-options */
  @Get('filter-options')
  getFilterOptions() {
    return this.traineeInformationService.getFilterOptions();
  }

  /** GET /api/admin/trainees/:id */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.traineeInformationService.getTraineeProfile(id);
  }

  /**
   * PATCH /api/admin/trainees/:traineeId
   * Saves the Edit Trainee form and returns the updated profile.
   */
  @Patch(':traineeId')
  async update(
    @Param('traineeId', ParseUUIDPipe) traineeId: string,
    @Body() dto: UpdateTraineeDto,
  ) {
    await this.enrollmentsService.updateTrainee(traineeId, dto);
    return this.traineeInformationService.getTraineeProfile(traineeId);
  }

  /** GET /api/admin/trainees/:traineeId/change-history */
  @Get(':traineeId/change-history')
  getChangeHistory(@Param('traineeId', ParseUUIDPipe) traineeId: string) {
    return this.enrollmentsService.getTraineeChangeHistory(traineeId);
  }
}
