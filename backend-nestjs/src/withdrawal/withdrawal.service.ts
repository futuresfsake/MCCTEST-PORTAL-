import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  enrollment_status_enum,
  Prisma,
  withdrawal_status_enum,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { WithdrawalQueryDto } from './dto/withdrawal-query.dto';

/**
 * Withdrawal pipeline (decision D-06, sequential):
 * PENDING_VALIDATION -> trainer -> TRAINER_VALIDATED -> registrar ->
 * PENDING_ADMIN_SIGNOFF -> admin -> APPROVED. Any validator can REJECT and the
 * trainee can CANCEL while the request is still PENDING_VALIDATION.
 *
 * This service is shared by every role. This file holds the trainee side; the
 * trainer, registrar and admin methods are added by their own tickets.
 */

/** A request in any of these states is still "open" for its enrollment. */
export const OPEN_STATUSES: withdrawal_status_enum[] = [
  withdrawal_status_enum.PENDING_VALIDATION,
  withdrawal_status_enum.TRAINER_VALIDATED,
  withdrawal_status_enum.PENDING_ADMIN_SIGNOFF,
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/** Only fields the trainee may see. Never `password_hash` or contact details. */
const actorSelect = {
  select: { first_name: true, last_name: true, role: true },
} satisfies Prisma.usersDefaultArgs;

const listInclude = {
  enrollments: {
    select: {
      id: true,
      enrollment_status: true,
      batch: {
        select: { batch_name: true, programs: { select: { name: true } } },
      },
    },
  },
} satisfies Prisma.withdrawal_requestInclude;

const detailInclude = {
  ...listInclude,
  trainer_validator: actorSelect,
  registrar_validator: actorSelect,
  admin_signer: actorSelect,
  status_history: {
    orderBy: [{ changed_at: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      old_status: true,
      new_status: true,
      changed_at: true,
      remarks: true,
      changed_by_user: actorSelect,
    },
  },
} satisfies Prisma.withdrawal_requestInclude;

type ListRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof listInclude;
}>;
type DetailRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof detailInclude;
}>;
type Actor = { first_name: string; last_name: string; role: string };

/** Today's calendar date in the school's timezone (a `@db.Date` column). */
function todayInManila(): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(new Date());
  return new Date(`${iso}T00:00:00.000Z`);
}

function actorName(actor: Actor | null): string | null {
  return actor ? `${actor.first_name} ${actor.last_name}`.trim() : null;
}

@Injectable()
export class WithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- trainee

  /** Submit a withdrawal request for one of the trainee's own enrollments. */
  async createForTrainee(userId: string, dto: CreateWithdrawalDto) {
    const traineeId = await this.requireTraineeId(userId);

    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: dto.enrollment_id },
      select: { id: true, trainee_id: true, enrollment_status: true },
    });
    // Same answer for "missing" and "someone else's": do not reveal which.
    if (!enrollment || enrollment.trainee_id !== traineeId) {
      throw new ForbiddenException('You can only withdraw your own enrollment');
    }
    if (enrollment.enrollment_status !== enrollment_status_enum.ENROLLED) {
      throw new BadRequestException(
        'Only an enrolled enrollment can be withdrawn',
      );
    }

    try {
      // Serializable so two simultaneous submits cannot both pass the check.
      const created = await this.prisma.$transaction(
        async (tx) => {
          const open = await tx.withdrawal_request.findFirst({
            where: {
              enrollment_id: enrollment.id,
              withdrawal_status: { in: OPEN_STATUSES },
            },
            select: { withdrawal_request_id: true },
          });
          if (open) {
            throw new ConflictException(
              'A withdrawal request is already in progress for this enrollment',
            );
          }

          const request = await tx.withdrawal_request.create({
            data: {
              enrollment_id: enrollment.id,
              requested_reason: dto.requested_reason,
              date_requested: todayInManila(),
              withdrawal_status: withdrawal_status_enum.PENDING_VALIDATION,
            },
            select: { withdrawal_request_id: true },
          });
          await tx.withdrawal_status_history.create({
            data: {
              withdrawal_request_id: request.withdrawal_request_id,
              old_status: null,
              new_status: withdrawal_status_enum.PENDING_VALIDATION,
              changed_by: userId,
            },
          });
          return request;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return this.getForTrainee(userId, created.withdrawal_request_id);
    } catch (error) {
      if (this.isSerializationConflict(error)) {
        throw new ConflictException(
          'A withdrawal request is already in progress for this enrollment',
        );
      }
      throw error;
    }
  }

  /** The trainee's own requests, newest first. */
  async listForTrainee(userId: string, query: WithdrawalQueryDto) {
    const traineeId = await this.requireTraineeId(userId);
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where: Prisma.withdrawal_requestWhereInput = {
      enrollments: { trainee_id: traineeId },
      ...(query.status ? { withdrawal_status: query.status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.withdrawal_request.findMany({
        where,
        include: listInclude,
        orderBy: [
          { date_requested: 'desc' },
          { withdrawal_request_id: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.withdrawal_request.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.serializeListRow(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** One of the trainee's requests with its full status history. */
  async getForTrainee(userId: string, requestId: string) {
    const traineeId = await this.requireTraineeId(userId);
    const row = await this.prisma.withdrawal_request.findFirst({
      where: {
        withdrawal_request_id: requestId,
        enrollments: { trainee_id: traineeId },
      },
      include: detailInclude,
    });
    // Someone else's request looks exactly like a missing one.
    if (!row) throw new NotFoundException('Withdrawal request not found');
    return this.serializeDetail(row);
  }

  /** Cancel a request. Only allowed before the trainer has acted on it. */
  async cancelForTrainee(userId: string, requestId: string) {
    const traineeId = await this.requireTraineeId(userId);

    await this.prisma.$transaction(async (tx) => {
      const request = await tx.withdrawal_request.findFirst({
        where: {
          withdrawal_request_id: requestId,
          enrollments: { trainee_id: traineeId },
        },
        select: { withdrawal_status: true },
      });
      if (!request) throw new NotFoundException('Withdrawal request not found');

      // Conditional update: if the trainer acts at the same moment, only one
      // of the two writes wins.
      const updated = await tx.withdrawal_request.updateMany({
        where: {
          withdrawal_request_id: requestId,
          withdrawal_status: withdrawal_status_enum.PENDING_VALIDATION,
        },
        data: { withdrawal_status: withdrawal_status_enum.CANCELLED },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          'Only a request that is still pending validation can be cancelled',
        );
      }
      await tx.withdrawal_status_history.create({
        data: {
          withdrawal_request_id: requestId,
          old_status: withdrawal_status_enum.PENDING_VALIDATION,
          new_status: withdrawal_status_enum.CANCELLED,
          changed_by: userId,
        },
      });
    });

    return this.getForTrainee(userId, requestId);
  }

  // ---------------------------------------------------------------- helpers

  private async requireTraineeId(userId: string): Promise<string> {
    const trainee = await this.prisma.trainee.findUnique({
      where: { users_id: userId },
      select: { id: true },
    });
    if (!trainee) {
      throw new ForbiddenException('No trainee profile for this account');
    }
    return trainee.id;
  }

  /**
   * Two serializable transactions that overlap: PostgreSQL aborts one with
   * SQLSTATE 40001. Through the pg driver adapter this arrives as a
   * `DriverAdapterError` (kind `TransactionWriteConflict`); through the
   * regular engine it is Prisma error P2034. Both mean "lost the race".
   */
  private isSerializationConflict(error: unknown): boolean {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    ) {
      return true;
    }
    const cause = (error as { cause?: unknown } | null)?.cause as
      { kind?: unknown; originalCode?: unknown } | undefined;
    return (
      (error as { name?: unknown } | null)?.name === 'DriverAdapterError' &&
      (cause?.kind === 'TransactionWriteConflict' ||
        cause?.originalCode === '40001')
    );
  }

  private serializeListRow(row: ListRow) {
    return {
      id: row.withdrawal_request_id,
      status: row.withdrawal_status,
      reason: row.requested_reason,
      dateRequested: row.date_requested.toISOString().slice(0, 10),
      enrollment: {
        id: row.enrollments.id,
        status: row.enrollments.enrollment_status,
        batchName: row.enrollments.batch.batch_name,
        programName: row.enrollments.batch.programs.name,
      },
    };
  }

  /**
   * Detail = list row + the pipeline for the stepper: who acted at each stage
   * and when, plus the full history. Validators' private remarks are not
   * returned; a rejection reason travels in the history row's remarks.
   */
  private serializeDetail(row: DetailRow) {
    return {
      ...this.serializeListRow(row),
      stages: {
        trainer: {
          validated: row.trainer_validated,
          by: actorName(row.trainer_validator),
          at: row.trainer_validated_at,
        },
        registrar: {
          by: actorName(row.registrar_validator),
          at: row.registrar_validated_at,
        },
        admin: {
          by: actorName(row.admin_signer),
          at: row.admin_signed_off_at,
        },
      },
      history: row.status_history.map((entry) => ({
        id: entry.id,
        oldStatus: entry.old_status,
        newStatus: entry.new_status,
        changedAt: entry.changed_at,
        remarks: entry.remarks,
        changedBy: {
          name: actorName(entry.changed_by_user),
          role: entry.changed_by_user.role,
        },
      })),
    };
  }
}
