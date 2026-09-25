//backend-nestjs\src\users\registrar\batches\batches.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  batch_status_enum,
  user_role_enum,
} from '../../../generated/prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto, UpdateBatchStatusDto } from './dto/update-batch.dto';

/** Ordered status progression — status can only move forward in this list. */
const STATUS_ORDER: batch_status_enum[] = [
  batch_status_enum.OPEN,
  batch_status_enum.ONGOING,
  batch_status_enum.CLOSED,
];

/** Fields restricted to OPEN-only editing */
const CRITICAL_FIELDS: (keyof UpdateBatchDto)[] = ['start_date', 'end_date', 'capacity'];

@Injectable()
export class BatchesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── LIST ─────────────────────────────────────────────────────────────────

  async findAll(filters: {
    program_id?: string;
    batch_status?: batch_status_enum;
    start_date_from?: string;
    start_date_to?: string;
    search?: string;
  }) {
    const { program_id, batch_status, start_date_from, start_date_to, search } = filters;

    const batches = await this.prisma.batch.findMany({
      where: {
        ...(program_id && { program_id }),
        ...(batch_status && { batch_status }),
        ...(start_date_from || start_date_to
          ? {
              start_date: {
                ...(start_date_from && { gte: new Date(start_date_from) }),
                ...(start_date_to && { lte: new Date(start_date_to) }),
              },
            }
          : {}),
        ...(search && {
          batch_name: { contains: search, mode: 'insensitive' },
        }),
      },
      include: {
        programs: {
          select: { id: true, name: true, program_code: true },
        },
        trainer: {
          include: {
            users: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                enrollment_status: { in: ['PENDING', 'ENROLLED', 'COMPLETED'] },
              },
            },
          },
        },
      },
      orderBy: [{ created_at: 'desc' }],
    });

    return batches.map((b) => this.formatBatch(b));
  }

  // ─── GET ONE ──────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const batch = await this.prisma.batch.findUnique({
      where: { id },
      include: {
        programs: {
          select: { id: true, name: true, program_code: true, total_training_hours: true },
        },
        trainer: {
          include: {
            users: {
              select: { id: true, first_name: true, last_name: true, email: true },
            },
          },
        },
        _count: {
          select: {
            enrollments: {
              where: {
                enrollment_status: { in: ['PENDING', 'ENROLLED', 'COMPLETED'] },
              },
            },
            training_session: true,
          },
        },
        batch_student_seq: true,
      },
    });

    if (!batch) throw new NotFoundException(`Batch ${id} not found`);

    return this.formatBatch(batch);
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(dto: CreateBatchDto, createdBy: string) {
    if (!dto.start_date || !dto.end_date) {
      throw new BadRequestException('Start date and end date are required');
    }

    if (!dto.program_id || !dto.trainer_id || !dto.batch_name || dto.capacity === undefined) {
      throw new BadRequestException(
        'Program, trainer, batch name, and capacity are required',
      );
    }

    // Validate date range
    const start = new Date(dto.start_date);
    const end = new Date(dto.end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('End date must be after start date');
    }

    // Verify program exists and is active
    const program = await this.prisma.programs.findUnique({
      where: { id: dto.program_id },
    });
    if (!program) throw new NotFoundException('Program not found');
    if (!program.is_active) throw new BadRequestException('Program is not active');

    // Verify trainer exists
    const trainer = await this.prisma.trainer.findUnique({
      where: { id: dto.trainer_id },
    });
    if (!trainer) throw new NotFoundException('Trainer not found');

    const batch = await this.prisma.batch.create({
      data: {
        program_id: dto.program_id,
        trainer_id: dto.trainer_id,
        created_by: createdBy,
        batch_name: dto.batch_name,
        capacity: dto.capacity,
        start_date: start,
        end_date: end,
        remarks: dto.remarks,
        batch_status: batch_status_enum.OPEN,
      },
      include: {
        programs: { select: { id: true, name: true, program_code: true } },
        trainer: {
          include: {
            users: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    // Bootstrap batch_student_seq row
    await this.prisma.batch_student_seq.create({
      data: { batch_id: batch.id, last_sequence: 0 },
    });

    return this.formatBatch(batch);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateBatchDto) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);

    if (batch.batch_status === batch_status_enum.CANCELLED) {
      throw new ForbiddenException('Cannot edit a cancelled batch');
    }

    // Block critical field edits for non-OPEN batches
    const isLocked = batch.batch_status !== batch_status_enum.OPEN;
    if (isLocked) {
      const criticalAttempted = CRITICAL_FIELDS.filter((f) => dto[f] !== undefined);
      if (criticalAttempted.length > 0) {
        throw new ForbiddenException(
          `Cannot modify ${criticalAttempted.join(', ')} on a batch that is ${batch.batch_status}`,
        );
      }
    }

    // Validate capacity won't drop below current enrollment count
    if (dto.capacity !== undefined) {
      const enrolledCount = await this.prisma.enrollments.count({
        where: {
          batch_id: id,
          enrollment_status: { in: ['PENDING', 'ENROLLED'] },
        },
      });
      if (dto.capacity < enrolledCount) {
        throw new BadRequestException(
          `Capacity (${dto.capacity}) cannot be less than current enrollment count (${enrolledCount})`,
        );
      }
    }

    const hasStartDate = dto.start_date !== undefined;
    const hasEndDate = dto.end_date !== undefined;

    // Validate dates if provided
    if (hasStartDate || hasEndDate) {
      const newStart = hasStartDate ? new Date(dto.start_date as string) : batch.start_date;
      const newEnd = hasEndDate ? new Date(dto.end_date as string) : batch.end_date;

      if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
        throw new BadRequestException('Start date and end date must be valid dates');
      }

      if (newEnd <= newStart) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    if (dto.trainer_id) {
      const trainer = await this.prisma.trainer.findUnique({ where: { id: dto.trainer_id } });
      if (!trainer) throw new NotFoundException('Trainer not found');
    }

    const updated = await this.prisma.batch.update({
      where: { id },
      data: {
        ...(dto.trainer_id && { trainer_id: dto.trainer_id }),
        ...(dto.batch_name && { batch_name: dto.batch_name }),
        ...(dto.capacity !== undefined && { capacity: dto.capacity }),
        ...(hasStartDate && dto.start_date && { start_date: new Date(dto.start_date) }),
        ...(hasEndDate && dto.end_date && { end_date: new Date(dto.end_date) }),
        ...(dto.venue !== undefined && { remarks: dto.venue }), // stored in remarks for now
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
      },
      include: {
        programs: { select: { id: true, name: true, program_code: true } },
        trainer: {
          include: {
            users: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    return this.formatBatch(updated);
  }

  // ─── ADVANCE STATUS ───────────────────────────────────────────────────────

  async advanceStatus(id: string, dto: UpdateBatchStatusDto) {
    const batch = await this.prisma.batch.findUnique({ where: { id } });
    if (!batch) throw new NotFoundException(`Batch ${id} not found`);

    if (batch.batch_status === batch_status_enum.CANCELLED) {
      throw new ForbiddenException('Cannot change status of a cancelled batch');
    }

    if (!dto.batch_status) {
      throw new BadRequestException('Batch status is required');
    }

    const currentIdx = STATUS_ORDER.indexOf(batch.batch_status as batch_status_enum);
    const nextIdx = STATUS_ORDER.indexOf(dto.batch_status as batch_status_enum);

    // Allow CANCELLED from any non-terminal state
    if (dto.batch_status === batch_status_enum.CANCELLED) {
      if (batch.batch_status === batch_status_enum.CLOSED) {
        throw new ForbiddenException('Cannot cancel a closed batch');
      }
    } else {
      // Must advance exactly one step
      if (nextIdx <= currentIdx) {
        throw new BadRequestException(
          `Status cannot move backward or stay the same. Current: ${batch.batch_status}, Requested: ${dto.batch_status}`,
        );
      }
      if (nextIdx !== currentIdx + 1) {
        throw new BadRequestException(
          `Status must advance one step at a time. Next valid status: ${STATUS_ORDER[currentIdx + 1]}`,
        );
      }
    }

    const updated = await this.prisma.batch.update({
      where: { id },
      data: { batch_status: dto.batch_status },
    });

    return { id: updated.id, batch_status: updated.batch_status };
  }

  // ─── DROPDOWN DATA ────────────────────────────────────────────────────────

    async getDropdownData() {
    const [programs, trainers] = await Promise.all([
        this.prisma.programs.findMany({
        where: {
            is_active: true,
        },
        select: {
            id: true,
            name: true,
            program_code: true,
        },
        orderBy: {
            name: 'asc',
        },
        }),

        this.prisma.trainer.findMany({
        where: {
            users: {
            role: user_role_enum.TRAINER,
            is_active: true,
            },
        },
        select: {
            id: true,
            user_id: true,
            users: {
            select: {
                first_name: true,
                middle_name: true,
                last_name: true,
            },
            },
        },
        orderBy: {
            users: {
            last_name: 'asc',
            },
        },
        }),
    ]);

    return {
        programs,

        trainers: trainers.map((trainer) => ({
        id: trainer.id,
        user_id: trainer.user_id,
        full_name: [
            trainer.users.first_name,
            trainer.users.middle_name,
            trainer.users.last_name,
        ]
            .filter(Boolean)
            .join(' '),
        })),
    };
    }

    async getPrograms() {
        return this.prisma.programs.findMany({
            where: { is_active: true },
            select: {
            id: true,
            name: true,
            program_code: true,
            },
            orderBy: {
            name: 'asc',
            },
        });
        }

    async getTrainers() {
        return this.prisma.users.findMany({
            where: {
            role: 'TRAINER',
            is_active: true,
            },
            select: {
            id: true,
            first_name: true,
            middle_name: true,
            last_name: true,
            email: true,
            },
            orderBy: {
            last_name: 'asc',
            },
        });
        }
  // ─── HELPER ───────────────────────────────────────────────────────────────

  private formatBatch(batch: any) {
    const enrollmentCount = batch._count?.enrollments ?? 0;
    return {
      id: batch.id,
      batch_name: batch.batch_name,
      capacity: batch.capacity,
      start_date: batch.start_date,
      end_date: batch.end_date,
      batch_status: batch.batch_status,
      remarks: batch.remarks,
      created_at: batch.created_at,
      program: batch.programs ?? null,
      trainer: batch.trainer
        ? {
            id: batch.trainer.id,
            user_id: batch.trainer.user_id,
            full_name: `${batch.trainer.users.first_name} ${batch.trainer.users.last_name}`,
          }
        : null,
      enrollment_count: enrollmentCount,
      available_slots: batch.capacity - enrollmentCount,
      session_count: batch._count?.training_session ?? undefined,
    };
  }
}