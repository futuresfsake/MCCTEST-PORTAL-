//backend-nestjs\src\users\registrar\batches\batches.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto, UpdateBatchStatusDto } from './dto/update-batch.dto';
import { batch_status_enum } from '../../../generated/prisma/client';

@Controller('registrar/batches')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.REGISTRAR, Role.ADMIN)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  /**
   * GET /registrar/batches
   * Query params: program_id, batch_status, start_date_from, start_date_to, search
   */
  @Get()
  findAll(
    @Query('program_id') program_id?: string,
    @Query('batch_status') batch_status?: batch_status_enum,
    @Query('start_date_from') start_date_from?: string,
    @Query('start_date_to') start_date_to?: string,
    @Query('search') search?: string,
  ) {
    return this.batchesService.findAll({
      program_id,
      batch_status,
      start_date_from,
      start_date_to,
      search,
    });
  }

    @Get('programs')
    getPrograms() {
    return this.batchesService.getPrograms();
    }

    @Get('trainers')
    getTrainers() {
    return this.batchesService.getTrainers();
    }

    @Get('dropdown-data')
    getDropdownData() {
    return this.batchesService.getDropdownData();
    }

    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.batchesService.findOne(id);
    }

  /**
   * POST /api/registrar/batches
   */
    @Post()
    create(@Body() dto: CreateBatchDto, @Request() req: any) {
    
    return this.batchesService.create(dto, req.user?.id);
    }


  /**
   * PATCH /api/registrar/batches/:id
   */
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBatchDto) {
    return this.batchesService.update(id, dto);
  }

  /**
   * PATCH /api/registrar/batches/:id/status
   * Advances batch status (OPEN → ONGOING → CLOSED, or → CANCELLED)
   */
  @Patch(':id/status')
  advanceStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBatchStatusDto,
  ) {
    return this.batchesService.advanceStatus(id, dto);
  }
}