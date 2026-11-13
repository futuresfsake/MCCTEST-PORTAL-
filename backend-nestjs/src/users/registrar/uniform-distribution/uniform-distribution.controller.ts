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
import { DistributeUniformDto } from './dto/distribute-uniform.dto';
import { UniformDistributionQueryDto } from './dto/uniform-distribution-query.dto';
import { UniformDistributionService } from './uniform-distribution.service';

@Controller('registrar/uniform-distribution')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR)
export class UniformDistributionController {
  constructor(
    private readonly uniformDistributionService: UniformDistributionService,
  ) {}

  @Get()
  list(@Query() query: UniformDistributionQueryDto) {
    return this.uniformDistributionService.list(query);
  }

  @Post(':enrollmentId/distribute')
  distribute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @Body() dto: DistributeUniformDto,
  ) {
    return this.uniformDistributionService.distribute(
      enrollmentId,
      user.id,
      dto,
    );
  }
}
