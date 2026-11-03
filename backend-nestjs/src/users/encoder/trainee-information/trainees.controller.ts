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

/** Read-only Trainee Information for encoders (all trainees, no scope). */
@Controller('encoder/trainees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ENCODER)
// Search-as-you-type and paging need headroom; matches the global limit.
@Throttle({ default: { limit: 120, ttl: 60000 } })
export class EncoderTraineesController {
  constructor(
    private readonly traineeInformationService: TraineeInformationService,
  ) {}

  /** GET /api/encoder/trainees */
  @Get()
  findAll(@Query() query: TraineeListQueryDto) {
    return this.traineeInformationService.listTrainees(query);
  }

  /** GET /api/encoder/trainees/filter-options */
  @Get('filter-options')
  getFilterOptions() {
    return this.traineeInformationService.getFilterOptions();
  }

  /** GET /api/encoder/trainees/:id */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.traineeInformationService.getTraineeProfile(id);
  }
}
