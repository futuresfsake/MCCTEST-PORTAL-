import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  batch_schedule_change_enum,
  batch_status_enum,
  enrollment_status_enum,
} from '../generated/prisma/enums';
import {
  findProgramRuleConflict,
  localCalendarDay,
  programRuleBatchSelect,
} from '../enrollments/enrollments.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_STATUSES: enrollment_status_enum[] = ['PENDING', 'ENROLLED'];

/** The batch values a schedule change reads and compares. */
export interface LockedBatch {
  id: string;
  trainer_id: string;
  batch_name: string;
  start_date: Date;
  end_date: Date;
  batch_status: batch_status_enum;
  start_date_confirmed_at: Date | null;
}

/** A trainee of the batch whose other active enrollment would overlap. */
export interface TraineeConflict {
  traineeId: string;
  name: string;
  systemId: string | null;
  reason: string;
}

const historySelect = {
  id: true,
  change_type: true,
  old_start_date: true,
  new_start_date: true,
  old_end_date: true,
  new_end_date: true,
  old_status: true,
  new_status: true,
  reason: true,
  changed_at: true,
  users: { select: { first_name: true, last_name: true, role: true } },
} satisfies Prisma.batch_schedule_historySelect;

type HistoryRow = Prisma.batch_schedule_historyGetPayload<{
  select: typeof historySelect;
}>;

/** @db.Date values arrive as UTC midnight; keep just the calendar day. */
export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** A YYYY-MM-DD string as the UTC midnight Prisma uses for @db.Date. */
export function parseDateOnly(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || toDateOnly(date) !== value) {
    throw new BadRequestException(`${value} is not a valid date.`);
  }
  return date;
}

/** Today's local calendar day, the same convention as enrollment. */
export function today(): Date {
  return localCalendarDay(new Date());
}

function toHistoryEntry(row: HistoryRow) {
  return {
    id: row.id,
    changeType: row.change_type,
    oldStartDate: toDateOnly(row.old_start_date),
    newStartDate: toDateOnly(row.new_start_date),
    oldEndDate: toDateOnly(row.old_end_date),
    newEndDate: toDateOnly(row.new_end_date),
    oldStatus: row.old_status,
    newStatus: row.new_status,
    reason: row.reason,
    changedAt: row.changed_at,
    changedBy: `${row.users.first_name} ${row.users.last_name}`.trim(),
    changedByRole: row.users.role,
  };
}

export type ScheduleHistoryEntry = ReturnType<typeof toHistoryEntry>;

/**
 * The batch date rules shared by the trainer, Registrar and Admin endpoints:
 * the row lock, the trainee-conflict check (the enrollment overlap rule), the
 * recorded-session check and the history write.
 */
@Injectable()
export class BatchScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Locks the batch row for the rest of the transaction, so two changes to the
   * same batch run one after the other and the second sees the first.
   */
  async lockBatch(
    tx: Prisma.TransactionClient,
    batchId: string,
  ): Promise<LockedBatch> {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM batch WHERE id = ${batchId}::uuid FOR UPDATE`;
    if (rows.length === 0) throw new NotFoundException('Batch not found.');

    return tx.batch.findUniqueOrThrow({
      where: { id: batchId },
      select: {
        id: true,
        trainer_id: true,
        batch_name: true,
        start_date: true,
        end_date: true,
        batch_status: true,
        start_date_confirmed_at: true,
      },
    });
  }

  /** The end date must be after the start date. */
  assertEndAfterStart(start: Date, end: Date) {
    if (end <= start) {
      throw new BadRequestException(
        'The end date must be after the start date.',
      );
    }
  }

  /** A batch cannot start after a session it already recorded. */
  async assertNoSessionBefore(
    tx: Prisma.TransactionClient,
    batchId: string,
    newStart: Date,
  ) {
    const session = await tx.training_session.findFirst({
      where: { batch_id: batchId, session_date: { lt: newStart } },
      orderBy: { session_date: 'asc' },
      select: { session_date: true },
    });
    if (session) {
      throw new BadRequestException(
        `A session is already recorded on ${toDateOnly(session.session_date)}. The start date cannot be after it.`,
      );
    }
  }

  /**
   * The enrolled trainees of the batch whose other active enrollment would
   * overlap the new dates, by the same rule enrollment uses. Two queries,
   * whatever the number of trainees.
   */
  async findTraineeConflicts(
    db: Prisma.TransactionClient,
    batchId: string,
    newStart: Date,
    newEnd: Date,
  ): Promise<TraineeConflict[]> {
    const batch = await db.batch.findUnique({
      where: { id: batchId },
      select: programRuleBatchSelect,
    });
    if (!batch) throw new NotFoundException('Batch not found.');
    const candidate = { ...batch, start_date: newStart, end_date: newEnd };

    const enrollments = await db.enrollments.findMany({
      where: { batch_id: batchId, enrollment_status: { in: ACTIVE_STATUSES } },
      select: {
        trainee: {
          select: {
            id: true,
            users: {
              select: { first_name: true, last_name: true, system_id: true },
            },
            enrollments: {
              where: {
                batch_id: { not: batchId },
                enrollment_status: { in: ACTIVE_STATUSES },
              },
              select: { batch: { select: programRuleBatchSelect } },
            },
          },
        },
      },
    });

    const conflicts: TraineeConflict[] = [];
    for (const { trainee } of enrollments) {
      const reason = findProgramRuleConflict(
        trainee.enrollments.map((e) => e.batch),
        candidate,
      );
      if (reason) {
        conflicts.push({
          traineeId: trainee.id,
          name: `${trainee.users?.first_name ?? ''} ${trainee.users?.last_name ?? ''}`.trim(),
          systemId: trainee.users?.system_id ?? null,
          reason,
        });
      }
    }
    return conflicts;
  }

  /** Refuses new dates that would put a trainee of the batch in conflict. */
  async assertNoTraineeConflicts(
    tx: Prisma.TransactionClient,
    batchId: string,
    newStart: Date,
    newEnd: Date,
  ) {
    const conflicts = await this.findTraineeConflicts(
      tx,
      batchId,
      newStart,
      newEnd,
    );
    if (conflicts.length > 0) {
      const names = conflicts
        .map((c) => (c.systemId ? `${c.name} (${c.systemId})` : c.name))
        .join(', ');
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: `These dates would conflict with another enrollment of ${conflicts.length} ${conflicts.length === 1 ? 'trainee' : 'trainees'}: ${names}.`,
        conflicts,
      });
    }
  }

  /** Writes one history row, in the caller's transaction. */
  async recordHistory(
    tx: Prisma.TransactionClient,
    before: LockedBatch,
    after: {
      start_date: Date;
      end_date: Date;
      batch_status: batch_status_enum;
    },
    changeType: batch_schedule_change_enum,
    reason: string,
    changedBy: string,
  ) {
    await tx.batch_schedule_history.create({
      data: {
        batch_id: before.id,
        changed_by: changedBy,
        change_type: changeType,
        old_start_date: before.start_date,
        new_start_date: after.start_date,
        old_end_date: before.end_date,
        new_end_date: after.end_date,
        old_status: before.batch_status,
        new_status: after.batch_status,
        reason,
      },
    });
  }

  /** The batch timeline, newest first. Read-only. */
  async getHistory(
    batchId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<ScheduleHistoryEntry[]> {
    const rows = await db.batch_schedule_history.findMany({
      where: { batch_id: batchId },
      orderBy: [{ changed_at: 'desc' }, { id: 'desc' }],
      select: historySelect,
    });
    return rows.map(toHistoryEntry);
  }
}
