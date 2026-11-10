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
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { EnrollmentsService } from '../../../enrollments/enrollments.service';
import {
  CreateEnrollmentDto,
  RequirementChecklistDto,
} from '../../../enrollments/dto/create-enrollment.dto';
import {
  UpdateEnrollmentStatusDto,
  EnrollmentFilterDto,
} from '../../../enrollments/dto/update-enrollment.dto';
import {
  ChangeBatchDto,
  ChangeProgramDto,
} from '../../../enrollments/dto/change-enrollment.dto';

/**
 * Admin access to enrollments. Same shared EnrollmentsService and DTOs as the
 * registrar controller; only the route prefix and the required role differ.
 * Static routes are declared before ':id' so they are not read as an id.
 */
@Controller('admin/enrollments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminEnrollmentsController {
  /** The shared enrollment logic, also used by the registrar controller */
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  /**
   * GET /api/admin/enrollments/search/trainees?q=
   * Finds existing trainees by name or contact number, so a returning
   * trainee can be re-enrolled instead of entered again.
   */
  @Get('search/trainees')
  searchTrainees(@Query('q') query: string) {
    return this.enrollmentsService.searchTrainees(query);
  }

  /**
   * GET /api/admin/enrollments/available/batches?traineeId=
   * Lists open batches for the enrollment form. When a trainee is given, each
   * batch says whether that trainee may join it and, if not, why.
   */
  @Get('available/batches')
  getAvailableBatches(
    @Query('traineeId', new ParseUUIDPipe({ optional: true }))
    traineeId?: string,
  ) {
    return this.enrollmentsService.getAvailableBatches(traineeId);
  }

  /**
   * GET /api/admin/enrollments/programs
   * Lists programs for the enrollment table's program filter.
   */
  @Get('programs')
  getPrograms() {
    return this.enrollmentsService.getPrograms();
  }

  /**
   * GET /api/admin/enrollments?search=&programId=&batchId=&status=&startDate=&endDate=&skip=&take=
   * Paginated list of all enrollments, with optional filters.
   */
  @Get()
  getEnrollments(@Query() filters: EnrollmentFilterDto) {
    return this.enrollmentsService.getEnrollments(filters);
  }

  /**
   * GET /api/admin/enrollments/:id
   * Full detail of one enrollment: trainee profile, beneficiary, every
   * program the trainee is enrolled in, documents, payment and status.
   */
  @Get(':id')
  getEnrollmentDetail(@Param('id', ParseUUIDPipe) enrollmentId: string) {
    return this.enrollmentsService.getEnrollmentDetail(enrollmentId);
  }

  /**
   * POST /api/admin/enrollments
   * Enrolls a trainee (new or returning) into a batch, using the same rules
   * as the registrar. The logged-in admin is saved as `enrolled_by`.
   */
  @Post()
  createEnrollment(
    @Body() createDto: CreateEnrollmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.enrollmentsService.createEnrollment(createDto, currentUser.id);
  }

  /**
   * PATCH /api/admin/enrollments/:id/status
   * Changes the enrollment status (e.g. ENROLLED to WITHDRAWN). Remarks sent
   * with the change are added to the existing remarks.
   */
  @Patch(':id/status')
  updateEnrollmentStatus(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Body() updateDto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentsService.updateEnrollmentStatus(
      enrollmentId,
      updateDto,
    );
  }

  /**
   * PATCH /api/admin/enrollments/:id/requirements
   * Saves which documents the trainee has submitted. The logged-in admin is
   * saved as `checked_by`.
   */
  @Patch(':id/requirements')
  updateRequirementChecklist(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Body() checklist: RequirementChecklistDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.enrollmentsService.updateRequirementChecklist(
      enrollmentId,
      checklist,
      currentUser.id,
    );
  }

  /**
   * GET /api/admin/enrollments/:id/change-options
   * Batches this enrollment may move to: same program and other programs.
   */
  @Get(':id/change-options')
  getChangeOptions(@Param('id', ParseUUIDPipe) enrollmentId: string) {
    return this.enrollmentsService.getChangeOptions(enrollmentId);
  }

  /**
   * POST /api/admin/enrollments/:id/change-batch
   * Moves the enrollment to another batch of the same program.
   */
  @Post(':id/change-batch')
  changeBatch(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: ChangeBatchDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.enrollmentsService.changeBatch(
      enrollmentId,
      dto,
      currentUser.id,
    );
  }

  /**
   * POST /api/admin/enrollments/:id/change-program
   * Withdraws this enrollment and creates a new one in the other program.
   */
  @Post(':id/change-program')
  changeProgram(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: ChangeProgramDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.enrollmentsService.changeProgram(
      enrollmentId,
      dto,
      currentUser.id,
    );
  }
}
