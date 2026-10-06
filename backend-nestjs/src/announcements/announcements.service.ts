import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums/role.enum';
import {
  announcement_scope_enum,
  batch_status_enum,
  enrollment_status_enum,
} from '../generated/prisma/client';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';

type AuthenticatedUser = { id: string; role: string };
type AnnouncementListQuery = {
  page?: string;
  limit?: string;
  scope?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
};

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateScope(dto: CreateAnnouncementDto) {
    const hasProgram = dto.program_id !== undefined;
    const hasBatch = dto.batch_id !== undefined;

    if (
      dto.scope === announcement_scope_enum.GLOBAL &&
      (hasProgram || hasBatch)
    ) {
      throw new BadRequestException(
        'GLOBAL announcements must not include program_id or batch_id',
      );
    }

    if (
      dto.scope === announcement_scope_enum.PROGRAM &&
      (!dto.program_id || hasBatch)
    ) {
      throw new BadRequestException(
        'PROGRAM announcements require program_id and must not include batch_id',
      );
    }

    if (
      dto.scope === announcement_scope_enum.BATCH &&
      (!dto.batch_id || hasProgram)
    ) {
      throw new BadRequestException(
        'BATCH announcements require batch_id and must not include program_id',
      );
    }
  }

  private assertCanPost(scope: announcement_scope_enum, role: string) {
    const allowedScopes: Record<string, announcement_scope_enum[]> = {
      [Role.ADMIN]: [
        announcement_scope_enum.GLOBAL,
        announcement_scope_enum.PROGRAM,
        announcement_scope_enum.BATCH,
      ],
      [Role.REGISTRAR]: [
        announcement_scope_enum.GLOBAL,
        announcement_scope_enum.PROGRAM,
        announcement_scope_enum.BATCH,
      ],
      [Role.ENCODER]: [
        announcement_scope_enum.GLOBAL,
        announcement_scope_enum.PROGRAM,
        announcement_scope_enum.BATCH,
      ],
      [Role.TRAINER]: [
        announcement_scope_enum.PROGRAM,
        announcement_scope_enum.BATCH,
      ],
    };

    if (!allowedScopes[role]?.includes(scope)) {
      throw new ForbiddenException(
        'Your role is not allowed to post an announcement with this scope',
      );
    }
  }

  async getOptions() {
    const [programs, batches] = await Promise.all([
      this.prisma.programs.findMany({
        where: { is_active: true },
        select: { id: true, name: true, program_code: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.batch.findMany({
        where: {
          batch_status: {
            in: [batch_status_enum.OPEN, batch_status_enum.ONGOING],
          },
        },
        select: {
          id: true,
          batch_name: true,
          programs: { select: { name: true } },
        },
        orderBy: { batch_name: 'asc' },
      }),
    ]);

    return { programs, batches };
  }

  async create(dto: CreateAnnouncementDto, user: AuthenticatedUser) {
    this.validateScope(dto);
    this.assertCanPost(dto.scope, user.role);

    if (dto.program_id) {
      const program = await this.prisma.programs.findUnique({
        where: { id: dto.program_id },
        select: { id: true },
      });
      if (!program) throw new NotFoundException('Program not found');
    }

    if (dto.batch_id) {
      const batch = await this.prisma.batch.findUnique({
        where: { id: dto.batch_id },
        select: { id: true },
      });
      if (!batch) throw new NotFoundException('Batch not found');
    }

    return this.prisma.announcements.create({
      data: {
        posted_by: user.id,
        scope: dto.scope,
        content: dto.content.trim(),
        program_id: dto.program_id,
        batch_id: dto.batch_id,
        remarks: dto.remarks?.trim() || null,
      },
      include: { users: true, programs: true, batch: true },
    });
  }

  //! FETCH ALL FILTERED ANNOUNCEMENTS PAGINATED LISTS OF ANNOUNCEMENTS
  async findAll(query: AnnouncementListQuery, user: AuthenticatedUser) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 10);
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100');
    }

    const scope = query.scope as announcement_scope_enum | undefined;
    if (scope && !Object.values(announcement_scope_enum).includes(scope)) {
      throw new BadRequestException('scope must be GLOBAL, PROGRAM, or BATCH');
    }

    const dateFrom = query.date_from ? new Date(query.date_from) : undefined;
    const dateTo = query.date_to ? new Date(query.date_to) : undefined;
    if (dateFrom && Number.isNaN(dateFrom.getTime())) {
      throw new BadRequestException('date_from must be a valid date');
    }
    if (dateTo && Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('date_to must be a valid date');
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw new BadRequestException('date_from cannot be later than date_to');
    }

    const where = {
      posted_by: user.id,
      ...(scope ? { scope } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              {
                content: {
                  contains: query.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
              {
                remarks: {
                  contains: query.search.trim(),
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(dateFrom || dateTo
        ? {
            posted_at: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.announcements.findMany({
        where,
        include: { users: true, programs: true, batch: true },
        orderBy: { posted_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.announcements.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findActive(user: AuthenticatedUser) {
    const scopes: Array<Record<string, unknown>> = [
      { scope: announcement_scope_enum.GLOBAL },
    ];
    if (user.role === Role.TRAINEE) {
      const trainee = await this.prisma.trainee.findFirst({
        where: { users_id: user.id },
        select: {
          enrollments: {
            where: { enrollment_status: enrollment_status_enum.ENROLLED },
            select: { batch_id: true, batch: { select: { program_id: true } } },
          },
        },
      });
      const enrollments = trainee?.enrollments ?? [];
      scopes.push(
        {
          scope: announcement_scope_enum.BATCH,
          batch_id: { in: enrollments.map((item) => item.batch_id) },
        },
        {
          scope: announcement_scope_enum.PROGRAM,
          program_id: { in: enrollments.map((item) => item.batch.program_id) },
        },
      );
    } else if (user.role === Role.TRAINER) {
      const trainer = await this.prisma.trainer.findUnique({
        where: { user_id: user.id },
        select: { batch: { select: { id: true, program_id: true } } },
      });
      const batches = trainer?.batch ?? [];
      scopes.push(
        {
          scope: announcement_scope_enum.BATCH,
          batch_id: { in: batches.map((item) => item.id) },
        },
        {
          scope: announcement_scope_enum.PROGRAM,
          program_id: { in: batches.map((item) => item.program_id) },
        },
      );
    }

    return this.prisma.announcements.findMany({
      where: { OR: scopes },
      include: { users: true, programs: true, batch: true },
      orderBy: { posted_at: 'desc' },
    });
  }

  async update(
    id: string,
    dto: UpdateAnnouncementDto,
    user: AuthenticatedUser,
  ) {
    const announcement = await this.prisma.announcements.findUnique({
      where: { id },
      select: { posted_by: true },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.posted_by !== user.id) {
      throw new ForbiddenException(
        'You can only edit announcements you posted',
      );
    }

    return this.prisma.announcements.update({
      where: { id },
      data: {
        ...(dto.content !== undefined && { content: dto.content.trim() }),
        ...(dto.remarks !== undefined && {
          remarks: dto.remarks.trim() || null,
        }),
      },
      include: { users: true, programs: true, batch: true },
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    const announcement = await this.prisma.announcements.findUnique({
      where: { id },
      select: { id: true, posted_by: true },
    });
    if (!announcement) throw new NotFoundException('Announcement not found');
    if (announcement.posted_by !== user.id) {
      throw new ForbiddenException(
        'You can only delete announcements you posted',
      );
    }
    await this.prisma.announcements.delete({ where: { id } });
    return { message: 'Announcement deleted successfully' };
  }
}
