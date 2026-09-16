import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { announcement_scope_enum } from '../generated/prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.announcements.findMany({
      orderBy: { posted_at: 'desc' },
    });
  }

  async create(dto: CreateAnnouncementDto, adminId: string) {
    this.validateScope(dto);

    if (dto.program_id) {
      const program = await this.prisma.programs.findUnique({
        where: { id: dto.program_id },
        select: { id: true },
      });
      if (!program) {
        throw new NotFoundException('The selected program was not found');
      }
    }

    if (dto.batch_id) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: dto.batch_id },
        select: { id: true },
      });
      if (!batch) {
        throw new NotFoundException('The selected batch was not found');
      }
    }

    return this.prisma.announcements.create({
      data: {
        posted_by: adminId,
        scope: dto.scope,
        content: dto.content,
        program_id: dto.program_id,
        batch_id: dto.batch_id,
        remarks: dto.remarks,
      },
    });
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    if (dto.content === undefined && dto.remarks === undefined) {
      throw new BadRequestException(
        'At least one of content or remarks must be provided',
      );
    }

    const existing = await this.prisma.announcements.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Announcement not found');
    }

    return this.prisma.announcements.update({
      where: { id },
      data: {
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.remarks !== undefined ? { remarks: dto.remarks } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.announcements.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Announcement not found');
    }

    await this.prisma.announcements.delete({ where: { id } });
    return { message: 'Announcement deleted successfully' };
  }

  private validateScope(dto: CreateAnnouncementDto) {
    const hasProgram = dto.program_id !== undefined;
    const hasBatch = dto.batch_id !== undefined;
    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (hasProgram && !uuidPattern.test(dto.program_id!)) {
      throw new BadRequestException(
        'program_id must be a valid UUID from the programs table',
      );
    }
    if (hasBatch && !uuidPattern.test(dto.batch_id!)) {
      throw new BadRequestException(
        'batch_id must be a valid UUID from the batch table',
      );
    }

    if (dto.scope === announcement_scope_enum.GLOBAL && (hasProgram || hasBatch)) {
      throw new BadRequestException(
        'GLOBAL announcements cannot include program_id or batch_id',
      );
    }
    if (dto.scope === announcement_scope_enum.PROGRAM && (!dto.program_id || hasBatch)) {
      throw new BadRequestException(
        'PROGRAM announcements require program_id and cannot include batch_id',
      );
    }
    if (dto.scope === announcement_scope_enum.BATCH && (!dto.batch_id || hasProgram)) {
      throw new BadRequestException(
        'BATCH announcements require batch_id and cannot include program_id',
      );
    }
  }
}
