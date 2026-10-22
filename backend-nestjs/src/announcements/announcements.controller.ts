import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import {
  AnnouncementListQuery,
  AnnouncementsService,
} from './announcements.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user.type';

/** The parts of the Express request these handlers read. */
type AnnouncementRequest = {
  user: AuthenticatedUser;
  query: AnnouncementListQuery;
};

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  create(@Body() dto: CreateAnnouncementDto, @Req() req: AnnouncementRequest) {
    return this.announcementsService.create(dto, req.user);
  }

  @Get('options')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  getOptions(@Req() req: AnnouncementRequest) {
    return this.announcementsService.getOptions(req.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  findAll(@Req() req: AnnouncementRequest) {
    return this.announcementsService.findAll(req.query, req.user);
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER, Role.TRAINEE)
  findActive(@Req() req: AnnouncementRequest) {
    return this.announcementsService.findActive(req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Req() req: AnnouncementRequest,
  ) {
    return this.announcementsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AnnouncementRequest,
  ) {
    return this.announcementsService.remove(id, req.user);
  }
}
