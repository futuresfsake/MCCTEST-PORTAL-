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
import { TraineeListQueryDto } from '../../../trainee-information/dto/trainee-list-query.dto';
import { TraineeInformationService } from '../../../trainee-information/trainee-information.service';

/** Read-only Trainee Information for admins (MP-24). */
@Controller('admin/trainees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
// Search-as-you-type and paging need headroom; matches the global limit.
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class AdminTraineesController {
  constructor(
    private readonly traineeInformationService: TraineeInformationService,
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
}
