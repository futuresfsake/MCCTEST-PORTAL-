import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/enums/role.enum';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { AttendanceService } from './attendance.service';
import { SaveAttendanceDto } from './dto/save-attendance.dto';

@Controller('trainer/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TRAINER)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('batches')
  listBatches(@Req() req: { user: AuthenticatedUser }) {
    return this.service.listBatches(req.user.id);
  }

  @Get('batches/:batchId/session')
  getSession(
    @Req() req: { user: AuthenticatedUser },
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Query('date') date: string,
  ) {
    return this.service.getSession(req.user.id, batchId, date);
  }

  @Get('batches/:batchId/sessions')
  listSessions(
    @Req() req: { user: AuthenticatedUser },
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.service.listSessions(req.user.id, batchId);
  }

  @Get('batches/:batchId/summary')
  summary(
    @Req() req: { user: AuthenticatedUser },
    @Param('batchId', ParseUUIDPipe) batchId: string,
  ) {
    return this.service.summary(req.user.id, batchId);
  }

  @Get('batches/:batchId/export')
  async export(
    @Req() req: { user: AuthenticatedUser },
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() response: Response,
  ) {
    const csv = await this.service.exportCsv(req.user.id, batchId, from, to);
    response
      .status(200)
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="attendance-${batchId}.csv"`,
      )
      .send(`\uFEFF${csv}`);
  }

  @Patch('batches/:batchId/session')
  save(
    @Req() req: { user: AuthenticatedUser },
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Body() dto: SaveAttendanceDto,
  ) {
    return this.service.save(req.user.id, batchId, dto);
  }

  @Delete('batches/:batchId/sessions/:date')
  deleteSession(
    @Req() req: { user: AuthenticatedUser },
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @Param('date') date: string,
  ) {
    return this.service.deleteSession(req.user.id, batchId, date);
  }

  @Get('sessions/:date/history')
  history(
    @Req() req: { user: AuthenticatedUser },
    @Param('date') date: string,
    @Query('batchId') batchId: string,
  ) {
    return this.service.history(req.user.id, batchId, date);
  }
}
