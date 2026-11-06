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
import { RequirementsService } from './requirements.service';
import {
  BulkRequirementDto,
  RequirementDetailQueryDto,
  RequirementListQueryDto,
  UpdateRequirementDto,
} from './dto/requirements.dto';

@Controller('registrar/requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  getList(@Query() query: RequirementListQueryDto) {
    return this.requirementsService.getList(query);
  }

  // Static routes stay above ':enrollmentId' so they are matched first.
  @Get('filter-options')
  getFilterOptions() {
    return this.requirementsService.getFilterOptions();
  }

  @Post('bulk')
  bulkMarkReceived(
    @Body() dto: BulkRequirementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requirementsService.bulkMarkReceived(dto, user.id);
  }

  @Get(':enrollmentId')
  getDetail(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Query() query: RequirementDetailQueryDto,
  ) {
    return this.requirementsService.getDetail(enrollmentId, query);
  }

  @Patch(':enrollmentId')
  update(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: UpdateRequirementDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requirementsService.update(enrollmentId, dto, user.id);
  }
}
