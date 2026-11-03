import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { RestockInventoryDto } from './dto/restock-inventory.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { QueryInventoryDto } from './dto/query-inventory.dto';
import { QueryInventoryHistoryDto } from './dto/query-inventory-history.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.REGISTRAR)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() query: QueryInventoryDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('summary')
  getSummary() {
    return this.inventoryService.getSummary();
  }

  // Declared before `:id/history` so the two routes can never be confused.
  @Get('history')
  getProgramHistory(@Query() query: QueryInventoryHistoryDto) {
    return this.inventoryService.getProgramHistory(query);
  }

  @Get('availability')
  getAvailability(
    @Query('programId', ParseUUIDPipe) programId: string,
    @Query('size') size: string,
  ) {
    return this.inventoryService.getAvailability(programId, size);
  }

  @Post()
  create(
    @Body() dto: CreateInventoryDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.inventoryService.create(dto, req.user.id);
  }

  @Post(':id/restock')
  restock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RestockInventoryDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.inventoryService.restock(id, dto, req.user.id);
  }

  @Post(':id/adjust')
  adjust(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustInventoryDto,
    @Request() req: { user: AuthenticatedUser },
  ) {
    return this.inventoryService.adjust(id, dto, req.user.id);
  }

  @Get(':id/history')
  getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.inventoryService.getHistory(id, cursor);
  }
}
