import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import {
  batch_schedule_change_enum,
  batch_status_enum,
  enrollment_status_enum,
} from '../../../generated/prisma/enums';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BatchScheduleService,
  LockedBatch,
  parseDateOnly,
  toDateOnly,
  today,
} from '../../../batch-schedule/batch-schedule.service';
import { STALE_BATCH_MESSAGE } from '../../../batch-schedule/batch-schedule.constants';
import {
  ClassListQueryDto,
  CloseClassDto,
  SetEndDateDto,
  SetStartDateDto,
  StartClassDto,
} from './dto/class-management.dto';

const ACTIVE_STATUSES: enrollment_status_enum[] = ['PENDING', 'ENROLLED'];

const classSelect = {
  id: true,
  batch_name: true,
  batch_status: true,
  start_date: true,
  end_date: true,
  capacity: true,
  start_date_confirmed_at: true,
  start_date_confirmer: { select: { first_name: true, last_name: true } },
  programs: {
    select: {
      id: true,
      name: true,
      program_schedule: {
        orderBy: { start_time: 'asc' },
        select: {
          schedule_name: true,
          days: true,
          start_time: true,
          end_time: true,
        },
      },
    },
  },
  _count: {
    select: {
      enrollments: { where: { enrollment_status: { in: ACTIVE_STATUSES } } },
    },
  },
} satisfies Prisma.batchSelect;

type ClassRow = Prisma.batchGetPayload<{ select: typeof classSelect }>;

function toClassSummary(row: ClassRow) {
  const confirmer = row.start_date_confirmer;
  return {
    id: row.id,
    batchName: row.batch_name,
    status: row.batch_status,
    startDate: toDateOnly(row.start_date),
    endDate: toDateOnly(row.end_date),
    confirmed: row.start_date_confirmed_at !== null,
    confirmedAt: row.start_date_confirmed_at,
    confirmedBy: confirmer
      ? `${confirmer.first_name} ${confirmer.last_name}`.trim()
      : null,
    enrolled: row._count.enrollments,
    capacity: row.capacity,
    program: { id: row.programs.id, name: row.programs.name },
    schedules: row.programs.program_schedule.map((s) => ({
      name: s.schedule_name,
      days: s.days,
      startTime: s.start_time.toISOString().slice(11, 16),
      endTime: s.end_time.toISOString().slice(11, 16),
    })),
  };
}

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Class Management for the trainer: the trainer's own batches, and the changes
 * to their dates and status. The trainer always comes from the login.
 */
@Injectable()
export class TrainerClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly schedule: BatchScheduleService,
  ) {}

  /** Only batches whose trainer is the logged-in user. */
  private ownBatch(userId: string, batchId?: string): Prisma.batchWhereInput {
    return {
      ...(batchId ? { id: batchId } : {}),
      trainer: { user_id: userId },
    };
  }

  async list(userId: string, query: ClassListQueryDto) {
    const where: Prisma.batchWhereInput = {
      ...this.ownBatch(userId),
      batch_status: query.status ?? { not: batch_status_enum.CANCELLED },
    };
    const [rows, total] = await Promise.all([
      this.prisma.batch.findMany({
        where,
        select: classSelect,
        orderBy: [{ start_date: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.batch.count({ where }),
    ]);

    return {
      data: rows.map(toClassSummary),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async detail(userId: string, batchId: string) {
    const row = await this.prisma.batch.findFirst({
      where: this.ownBatch(userId, batchId),
      select: classSelect,
    });
    if (!row) throw new NotFoundException('Batch not found.');
    return {
      ...toClassSummary(row),
      history: await this.schedule.getHistory(batchId),
    };
  }

  /** The trainees that the proposed dates would put in conflict. Changes nothing. */
  async dateCheck(
    userId: string,
    batchId: string,
    startDate: string,
    endDate: string,
  ) {
    await this.assertOwn(userId, batchId);
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    this.schedule.assertEndAfterStart(start, end);
    const conflicts = await this.schedule.findTraineeConflicts(
      this.prisma,
      batchId,
      start,
      end,
    );
    return { conflicts, count: conflicts.length };
  }

  async setStartDate(userId: string, batchId: string, dto: SetStartDateDto) {
    return this.change(userId, batchId, dto, async (tx, batch) => {
      this.assertStatus(
        batch,
        batch_status_enum.OPEN,
        'Only an open batch can have its start date changed.',
      );

      const start = parseDateOnly(dto.startDate);
      // By default the training keeps its length.
      const end = dto.endDate
        ? parseDateOnly(dto.endDate)
        : new Date(
            batch.end_date.getTime() +
              (start.getTime() - batch.start_date.getTime()),
          );
      this.schedule.assertEndAfterStart(start, end);
      await this.schedule.assertNoSessionBefore(tx, batchId, start);
      await this.schedule.assertNoTraineeConflicts(tx, batchId, start, end);

      await tx.batch.update({
        where: { id: batchId },
        data: {
          start_date: start,
          end_date: end,
          start_date_confirmed_by: userId,
          start_date_confirmed_at: new Date(),
        },
      });
      return {
        after: {
          start_date: start,
          end_date: end,
          batch_status: batch.batch_status,
        },
        changeType: batch.start_date_confirmed_at
          ? batch_schedule_change_enum.START_DATE_CHANGED
          : batch_schedule_change_enum.START_DATE_SET,
        announce: dto.notifyTrainees
          ? `Classes for ${batch.batch_name} will start on ${formatLongDate(start)} and end on ${formatLongDate(end)}. Reason: ${dto.reason}`
          : null,
      };
    });
  }

  async start(userId: string, batchId: string, dto: StartClassDto) {
    return this.change(userId, batchId, dto, async (tx, batch) => {
      this.assertStatus(
        batch,
        batch_status_enum.OPEN,
        'Only an open batch can be started.',
      );
      if (batch.start_date > today()) {
        throw new BadRequestException(
          `The batch starts on ${toDateOnly(batch.start_date)}. It can be started on or after that date.`,
        );
      }
      await tx.batch.update({
        where: { id: batchId },
        data: { batch_status: batch_status_enum.ONGOING },
      });
      return {
        after: {
          start_date: batch.start_date,
          end_date: batch.end_date,
          batch_status: batch_status_enum.ONGOING,
        },
        changeType: batch_schedule_change_enum.STARTED,
        announce: null,
      };
    });
  }

  async setEndDate(userId: string, batchId: string, dto: SetEndDateDto) {
    return this.change(userId, batchId, dto, async (tx, batch) => {
      this.assertStatus(
        batch,
        batch_status_enum.ONGOING,
        'Only an ongoing batch can have its end date changed.',
      );
      const end = parseDateOnly(dto.endDate);
      if (end < today()) {
        throw new BadRequestException('The end date cannot be in the past.');
      }
      this.schedule.assertEndAfterStart(batch.start_date, end);
      await this.schedule.assertNoTraineeConflicts(
        tx,
        batchId,
        batch.start_date,
        end,
      );

      await tx.batch.update({
        where: { id: batchId },
        data: { end_date: end },
      });
      return {
        after: {
          start_date: batch.start_date,
          end_date: end,
          batch_status: batch.batch_status,
        },
        changeType: batch_schedule_change_enum.END_DATE_CHANGED,
        announce: dto.notifyTrainees
          ? `Classes for ${batch.batch_name} will now end on ${formatLongDate(end)}. Reason: ${dto.reason}`
          : null,
      };
    });
  }

  /** Closing changes only the batch. The enrollments are left as they are. */
  async close(userId: string, batchId: string, dto: CloseClassDto) {
    return this.change(userId, batchId, dto, async (tx, batch) => {
      this.assertStatus(
        batch,
        batch_status_enum.ONGOING,
        'Only an ongoing batch can be closed.',
      );
      // A finished batch must not keep blocking the trainees' schedules.
      const now = today();
      const end = batch.end_date > now ? now : batch.end_date;
      await tx.batch.update({
        where: { id: batchId },
        data: { batch_status: batch_status_enum.CLOSED, end_date: end },
      });
      return {
        after: {
          start_date: batch.start_date,
          end_date: end,
          batch_status: batch_status_enum.CLOSED,
        },
        changeType: batch_schedule_change_enum.CLOSED,
        announce: null,
      };
    });
  }

  private async assertOwn(userId: string, batchId: string) {
    const found = await this.prisma.batch.findFirst({
      where: this.ownBatch(userId, batchId),
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Batch not found.');
  }

  private assertStatus(
    batch: LockedBatch,
    required: batch_status_enum,
    message: string,
  ) {
    if (batch.batch_status !== required) {
      throw new ConflictException(
        `${message} This batch is ${batch.batch_status}.`,
      );
    }
  }

  /**
   * One all-or-nothing change: lock the batch, check it is the trainer's and
   * unchanged since the trainer loaded it, apply the change, write the history
   * row and the optional announcement, then return the updated batch.
   */
  private async change(
    userId: string,
    batchId: string,
    dto: {
      reason: string;
      expectedStartDate: string;
      expectedEndDate: string;
      expectedStatus: batch_status_enum;
    },
    apply: (
      tx: Prisma.TransactionClient,
      batch: LockedBatch,
    ) => Promise<{
      after: {
        start_date: Date;
        end_date: Date;
        batch_status: batch_status_enum;
      };
      changeType: batch_schedule_change_enum;
      announce: string | null;
    }>,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const owner = await tx.batch.findFirst({
          where: this.ownBatch(userId, batchId),
          select: { id: true },
        });
        if (!owner) throw new NotFoundException('Batch not found.');

        const batch = await this.schedule.lockBatch(tx, batchId);
        if (
          toDateOnly(batch.start_date) !== dto.expectedStartDate ||
          toDateOnly(batch.end_date) !== dto.expectedEndDate ||
          batch.batch_status !== dto.expectedStatus
        ) {
          throw new ConflictException(STALE_BATCH_MESSAGE);
        }

        const result = await apply(tx, batch);
        await this.schedule.recordHistory(
          tx,
          batch,
          result.after,
          result.changeType,
          dto.reason,
          userId,
        );
        if (result.announce) {
          await tx.announcements.create({
            data: {
              posted_by: userId,
              scope: 'BATCH',
              batch_id: batchId,
              content: result.announce,
            },
          });
        }

        const row = await tx.batch.findUniqueOrThrow({
          where: { id: batchId },
          select: classSelect,
        });
        return {
          ...toClassSummary(row),
          history: await this.schedule.getHistory(batchId, tx),
        };
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
}
