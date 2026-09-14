import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Query,
  Param,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import {
  UpdateEnrollmentStatusDto,
  EnrollmentFilterDto,
} from './dto/update-enrollment.dto';

@Controller('registrar')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get('trainees/search')
  async searchTrainees(@Query('q') query: string) {
    return this.enrollmentsService.searchTrainees(query);
  }

  @Get('enrollments/search/trainees')
  async searchTraineesLegacy(@Query('q') query: string) {
    return this.enrollmentsService.searchTrainees(query);
  }

  @Get('enrollments/available/batches')
  async getAvailableBatches(@Query('traineeId') traineeId?: string) {
    return this.enrollmentsService.getAvailableBatches(traineeId);
  }

  @Get('enrollments/programs')
  async getPrograms() {
    return this.enrollmentsService.getPrograms();
  }

  @Get('enrollments')
  async getEnrollments(@Query() filters: EnrollmentFilterDto) {
    return this.enrollmentsService.getEnrollments(filters);
  }

  @Get('enrollments/:id')
  async getEnrollmentDetail(@Param('id') enrollmentId: string) {
    return this.enrollmentsService.getEnrollmentDetail(enrollmentId);
  }

  @Post('enrollments')
  async createEnrollment(
    @Body() createDto: CreateEnrollmentDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.enrollmentsService.createEnrollment(createDto, currentUser.id);
  }

  @Patch('enrollments/:id/status')
  async updateEnrollmentStatus(
    @Param('id') enrollmentId: string,
    @Body() updateDto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentsService.updateEnrollmentStatus(
      enrollmentId,
      updateDto,
    );
  }
}
