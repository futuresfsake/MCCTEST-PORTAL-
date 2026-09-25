import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProgramDto } from './dto/create-program.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  private timeStringToDate(time: string): Date {
    const [hours, minutes, seconds = 0] = time.split(':').map(Number);

    return new Date(
      Date.UTC(
        1970,
        0,
        1,
        hours,
        minutes,
        seconds,
      ),
    );
  }

  async findAll(
    search?: string,
    status?: string,
    page = 1,
    limit = 10,
  ) {
    if (status && !['active', 'archived'].includes(status)) {
      throw new BadRequestException(
        'status must be either active or archived',
      );
    }
    
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);

    const where = {
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
              {
                program_code: {
                  contains: search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(status
        ? {
            is_active: status === 'active',
          }
        : {}),
    };

    const [programs, total] = await Promise.all([
      this.prisma.programs.findMany({
        where,
        include: {
          program_schedule: true,
        },
        orderBy: {
          name: 'asc',
        },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),

      this.prisma.programs.count({
        where,
      }),
    ]);

    return {
      data: programs,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string) {
    const program = await this.prisma.programs.findUnique({
      where: { id },
      include: {
        program_schedule: true,
      },
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async create(dto: CreateProgramDto, userId: string) {
    const existingProgram = await this.prisma.programs.findFirst({
      where: {
        OR: [
          { name: dto.name },
          { program_code: dto.program_code },
        ],
      },
    });

    if (existingProgram) {
      throw new ConflictException(
        'A program with this name or program code already exists',
      );
    }

    return this.prisma.programs.create({
      data: {
        name: dto.name,
        program_code: dto.program_code,
        description: dto.description,
        is_accredited: dto.is_accredited ?? false,
        total_training_hours: dto.total_training_hours,
        approx_months: dto.approx_months,
        control_number_prefix: dto.control_number_prefix,
        created_by: userId,
        updated_by: userId,

        ...(dto.schedules?.length
          ? {
              program_schedule: {
                create: dto.schedules.map((schedule) => ({
                  schedule_name: schedule.schedule_name,
                  days: schedule.days as any,
                  start_time: this.timeStringToDate(schedule.start_time),
                  end_time: this.timeStringToDate(schedule.end_time),
                })),
              },
            }
          : {}),
      },
      include: {
        program_schedule: true,
      },
    });
  }

  async update(id: string, dto: UpdateProgramDto, userId: string) {
    await this.findOne(id);

    const existingProgram = await this.prisma.programs.findFirst({
      where: {
        OR: [
          ...(dto.name ? [{ name: dto.name }] : []),
          ...(dto.program_code
            ? [{ program_code: dto.program_code }]
            : []),
        ],
        NOT: {
          id,
        },
      },
    });

    if (existingProgram) {
      throw new ConflictException(
        'A program with this name or program code already exists',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If schedules were included in the PATCH request,
      // replace the existing schedules with the new ones.
      if (dto.schedules !== undefined) {
        await tx.program_schedule.deleteMany({
          where: {
            program_id: id,
          },
        });

        if (dto.schedules.length > 0) {
          await tx.program_schedule.createMany({
            data: dto.schedules.map((schedule) => ({
              program_id: id,
              schedule_name: schedule.schedule_name,
              days: schedule.days as any,
              start_time: this.timeStringToDate(schedule.start_time),
              end_time: this.timeStringToDate(schedule.end_time),
            })),
          });
        }
      }

      return tx.programs.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && {
            name: dto.name,
          }),

          ...(dto.program_code !== undefined && {
            program_code: dto.program_code,
          }),

          ...(dto.description !== undefined && {
            description: dto.description,
          }),

          ...(dto.is_accredited !== undefined && {
            is_accredited: dto.is_accredited,
          }),

          ...(dto.total_training_hours !== undefined && {
            total_training_hours: dto.total_training_hours,
          }),

          ...(dto.approx_months !== undefined && {
            approx_months: dto.approx_months,
          }),

          ...(dto.control_number_prefix !== undefined && {
            control_number_prefix: dto.control_number_prefix,
          }),

          updated_by: userId,
        },
        include: {
          program_schedule: true,
        },
      });
    });
  }

  async updateStatus(id: string, userId: string) {
    const program = await this.findOne(id);

    return this.prisma.programs.update({
      where: { id },
      data: {
        is_active: !program.is_active,
        updated_by: userId,
      },
      include: {
        program_schedule: true,
      },
    });
  }
}