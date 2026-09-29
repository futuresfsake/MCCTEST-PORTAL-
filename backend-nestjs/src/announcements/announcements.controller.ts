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
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  create(@Body() dto: CreateAnnouncementDto, @Req() req: any) {
    return this.announcementsService.create(dto, req.user);
  }

  @Get('options')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  getOptions() {
    return this.announcementsService.getOptions();
  }

  @Get()
  @Roles(Role.ADMIN, Role.REGISTRAR)
  findAll(@Req() req: any) {
    return this.announcementsService.findAll(req.query);
  }

  @Get('active')
  findActive(@Req() req: any) {
    return this.announcementsService.findActive(req.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR, Role.ENCODER, Role.TRAINER)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @Req() req: any,
  ) {
    return this.announcementsService.update(id, dto, req.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.REGISTRAR)
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.announcementsService.remove(id, req.user);
  }
}
