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
import { REQUIREMENT_DOCUMENTS } from '../requirements/requirements.constants';
import { AdminSignoffDto } from './dto/admin-signoff.dto';
import { AdminWithdrawalQueryDto } from './dto/admin-withdrawal-query.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { RegistrarWithdrawalQueryDto } from './dto/registrar-withdrawal-query.dto';
import { TrainerWithdrawalQueryDto } from './dto/trainer-withdrawal-query.dto';
import { ValidateWithdrawalRegistrarDto } from './dto/validate-withdrawal-registrar.dto';
import { ValidateWithdrawalTrainerDto } from './dto/validate-withdrawal-trainer.dto';
import { WithdrawalQueryDto } from './dto/withdrawal-query.dto';

/**
 * Withdrawal pipeline (decision D-06, sequential):
 * PENDING_VALIDATION -> trainer -> TRAINER_VALIDATED -> registrar ->
 * PENDING_ADMIN_SIGNOFF -> admin -> APPROVED. Any validator can REJECT and the
 * trainee can CANCEL while the request is still PENDING_VALIDATION.
 *
 * This service is shared by every role: it holds the trainee, trainer,
 * registrar and admin sides.
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

/** Who acted at each stage, plus the full history. Shared by every role's detail. */
const pipelineInclude = {
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

const detailInclude = {
  ...listInclude,
  ...pipelineInclude,
} satisfies Prisma.withdrawal_requestInclude;

/**
 * The trainer also sees who the trainee is. Name and ID only: no contact
 * details, no password hash.
 */
const trainerListInclude = {
  enrollments: {
    select: {
      id: true,
      enrollment_status: true,
      batch: {
        select: {
          id: true,
          batch_name: true,
          programs: { select: { name: true } },
        },
      },
      trainee: {
        select: {
          users: {
            select: { first_name: true, last_name: true, system_id: true },
          },
        },
      },
    },
  },
} satisfies Prisma.withdrawal_requestInclude;

const trainerDetailInclude = {
  ...trainerListInclude,
  ...pipelineInclude,
} satisfies Prisma.withdrawal_requestInclude;

type ListRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof listInclude;
}>;
type DetailRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof detailInclude;
}>;
type TrainerListRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof trainerListInclude;
}>;
type TrainerDetailRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof trainerDetailInclude;
}>;
type PipelineRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof pipelineInclude;
}>;

/**
 * The registrar sees every request, so the row also names the trainee and the
 * program. Name and ID only: no contact details, no password hash.
 */
const registrarListInclude = {
  enrollments: {
    select: {
      id: true,
      enrollment_status: true,
      batch: {
        select: {
          id: true,
          batch_name: true,
          programs: { select: { id: true, name: true } },
        },
      },
      trainee: {
        select: {
          users: {
            select: { first_name: true, last_name: true, system_id: true },
          },
        },
      },
    },
  },
} satisfies Prisma.withdrawal_requestInclude;

/** Receipts returned for the payment history pop-up. One enrollment has only a few. */
const MAX_PAYMENT_HISTORY = 50;

/**
 * Detail adds two things for information only (they never block an approval):
 * the trainee's document checklist from the Requirements feature, and
 * the enrollment's payments. "Enrollment fee paid" means at least one official
 * receipt with the reason ENROLLMENT exists. The whole payment
 * history is returned too, so the registrar can read it in a pop-up without
 * leaving the page.
 */
const registrarDetailInclude = {
  enrollments: {
    select: {
      ...registrarListInclude.enrollments.select,
      official_receipts: {
        orderBy: [{ payment_date: 'asc' }, { created_at: 'asc' }],
        take: MAX_PAYMENT_HISTORY,
        select: {
          or_number: true,
          payment_date: true,
          amount: true,
          payment_method: true,
          reason_of_dues: true,
        },
      },
      requirement_checklist: {
        select: {
          bc_nso_psa_copy: true,
          diploma_tor: true,
          brgy_clearance: true,
          one_by_one_pic: true,
          two_by_two_pic: true,
          passport_size: true,
        },
      },
    },
  },
  ...pipelineInclude,
} satisfies Prisma.withdrawal_requestInclude;

type RegistrarListRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof registrarListInclude;
}>;
type RegistrarDetailRow = Prisma.withdrawal_requestGetPayload<{
  include: typeof registrarDetailInclude;
}>;
type Actor = { first_name: string; last_name: string; role: string };

/** Today's calendar date in the school's timezone (a `@db.Date` column). */
function todayInManila(): Date {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(new Date());
  return new Date(`${iso}T00:00:00.000Z`);
}

function actorName(
  actor: Pick<Actor, 'first_name' | 'last_name'> | null,
): string | null {
  return actor ? `${actor.first_name} ${actor.last_name}`.trim() : null;
}

/** What one validator decided, for the admin's list: still waiting, approved or rejected. */
export type StageDecision = 'PENDING' | 'APPROVED' | 'REJECTED';

function trainerDecision(row: {
  trainer_validated: boolean;
  trainer_validated_by: string | null;
}): StageDecision {
  if (!row.trainer_validated_by) return 'PENDING';
  return row.trainer_validated ? 'APPROVED' : 'REJECTED';
}

/**
 * The registrar has no yes/no column: a request the registrar rejected is
 * REJECTED with a registrar but no admin sign-off. One the admin rejected
 * still counts as approved by the registrar.
 */
function registrarDecision(row: {
  withdrawal_status: withdrawal_status_enum;
  registrar_validated_by: string | null;
  admin_signed_off_by: string | null;
}): StageDecision {
  if (!row.registrar_validated_by) return 'PENDING';
  return row.withdrawal_status === withdrawal_status_enum.REJECTED &&
    !row.admin_signed_off_by
    ? 'REJECTED'
    : 'APPROVED';
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

  // ---------------------------------------------------------------- trainer

  /**
   * Requests from trainees in the trainer's own batches. Left without a status
   * it shows what needs the trainer (PENDING_VALIDATION); `ALL` shows every
   * status so past decisions can be reviewed.
   */
  async listForTrainer(userId: string, query: TrainerWithdrawalQueryDto) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const decided = query.status === 'DECIDED';
    const status =
      query.status === 'ALL' || query.status === 'DECIDED'
        ? undefined
        : (query.status ?? withdrawal_status_enum.PENDING_VALIDATION);

    // Each word must match the first, middle or last name or the system ID.
    const terms = (query.search ?? '').split(/\s+/).filter(Boolean).slice(0, 5);
    const where: Prisma.withdrawal_requestWhereInput = {
      enrollments: {
        batch: {
          trainer: { user_id: userId },
          ...(query.batchId ? { id: query.batchId } : {}),
        },
        ...(terms.length
          ? {
              trainee: {
                users: {
                  AND: terms.map((term) => ({
                    OR: [
                      { first_name: { contains: term, mode: 'insensitive' } },
                      { middle_name: { contains: term, mode: 'insensitive' } },
                      { last_name: { contains: term, mode: 'insensitive' } },
                      { system_id: { contains: term, mode: 'insensitive' } },
                    ],
                  })),
                },
              },
            }
          : {}),
      },
      ...(status ? { withdrawal_status: status } : {}),
      // The trainer's log: only requests this trainer already approved or rejected.
      ...(decided ? { trainer_validated_by: { not: null } } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.withdrawal_request.findMany({
        where,
        include: trainerListInclude,
        orderBy: [
          ...(decided
            ? [{ trainer_validated_at: 'desc' as const }]
            : [{ date_requested: 'desc' as const }]),
          { withdrawal_request_id: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.withdrawal_request.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.serializeTrainerListRow(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** One request from the trainer's own batches, with its full history. */
  async getForTrainer(userId: string, requestId: string) {
    await this.assertTrainerOwns(this.prisma, userId, requestId);
    const row = await this.prisma.withdrawal_request.findUniqueOrThrow({
      where: { withdrawal_request_id: requestId },
      include: trainerDetailInclude,
    });
    return this.serializeTrainerDetail(row);
  }

  /**
   * First validation step. Only a request that is still waiting for the
   * trainer can be validated. Approve moves it on to the registrar
   * (TRAINER_VALIDATED); reject ends it (REJECTED) and needs a reason.
   */
  async validateByTrainer(
    userId: string,
    requestId: string,
    dto: ValidateWithdrawalTrainerDto,
  ) {
    const approve = dto.action === 'APPROVE';
    const next = approve
      ? withdrawal_status_enum.TRAINER_VALIDATED
      : withdrawal_status_enum.REJECTED;

    await this.prisma.$transaction(async (tx) => {
      await this.assertTrainerOwns(tx, userId, requestId);

      // Conditional update: if the trainee cancels at the same moment, only
      // one of the two writes wins and the other gets a clean 400.
      const updated = await tx.withdrawal_request.updateMany({
        where: {
          withdrawal_request_id: requestId,
          withdrawal_status: withdrawal_status_enum.PENDING_VALIDATION,
        },
        data: {
          withdrawal_status: next,
          trainer_validated: approve,
          trainer_validated_by: userId,
          trainer_validated_at: new Date(),
          trainer_remarks: dto.remarks ?? null,
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          'Only a request that is waiting for the trainer can be validated',
        );
      }
      await tx.withdrawal_status_history.create({
        data: {
          withdrawal_request_id: requestId,
          old_status: withdrawal_status_enum.PENDING_VALIDATION,
          new_status: next,
          changed_by: userId,
          remarks: dto.remarks ?? null,
        },
      });
    });

    return this.getForTrainer(userId, requestId);
  }

  /**
   * The request must exist (404) and belong to a batch assigned to this
   * trainer (403). A role check alone is not enough: another trainer's
   * request must not be readable or actionable.
   */
  private async assertTrainerOwns(
    db: Prisma.TransactionClient,
    userId: string,
    requestId: string,
  ): Promise<void> {
    const row = await db.withdrawal_request.findUnique({
      where: { withdrawal_request_id: requestId },
      select: {
        enrollments: {
          select: {
            batch: { select: { trainer: { select: { user_id: true } } } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Withdrawal request not found');
    if (row.enrollments.batch.trainer.user_id !== userId) {
      throw new ForbiddenException(
        'This request is not from one of your batches',
      );
    }
  }

  // -------------------------------------------------------------- registrar

  /**
   * Every request, not scoped to a batch. Left without a
   * status it shows what waits for the registrar (TRAINER_VALIDATED); `ALL`
   * shows every status so past decisions and requests still with the trainer
   * can be found.
   */
  async listForRegistrar(query: RegistrarWithdrawalQueryDto) {
    return this.listAllRequests(
      query,
      withdrawal_status_enum.TRAINER_VALIDATED,
      (row) => this.serializeRegistrarListRow(row),
    );
  }

  /**
   * The list the registrar and the admin share: every request, not scoped to a
   * batch, with the same filters. Only the default status and the row shape
   * differ per role.
   */
  private async listAllRequests<T>(
    query: RegistrarWithdrawalQueryDto,
    defaultStatus: withdrawal_status_enum,
    serialize: (row: RegistrarListRow) => T,
  ) {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const status =
      query.status === 'ALL' ? undefined : (query.status ?? defaultStatus);

    // Each word must match the first, middle or last name or the system ID.
    const terms = (query.search ?? '').split(/\s+/).filter(Boolean).slice(0, 5);
    const where: Prisma.withdrawal_requestWhereInput = {
      enrollments: {
        batch: {
          ...(query.batchId ? { id: query.batchId } : {}),
          ...(query.programId ? { program_id: query.programId } : {}),
        },
        ...(terms.length
          ? {
              trainee: {
                users: {
                  AND: terms.map((term) => ({
                    OR: [
                      { first_name: { contains: term, mode: 'insensitive' } },
                      { middle_name: { contains: term, mode: 'insensitive' } },
                      { last_name: { contains: term, mode: 'insensitive' } },
                      { system_id: { contains: term, mode: 'insensitive' } },
                    ],
                  })),
                },
              },
            }
          : {}),
      },
      ...(status ? { withdrawal_status: status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.withdrawal_request.findMany({
        where,
        include: registrarListInclude,
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
      data: rows.map((row) => serialize(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** Programs, batches and statuses for the list filters. */
  async getRegistrarFilterOptions() {
    const [programs, batches] = await Promise.all([
      this.prisma.programs.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.batch.findMany({
        select: { id: true, batch_name: true, program_id: true },
        orderBy: { batch_name: 'asc' },
      }),
    ]);
    return {
      programs,
      batches: batches.map((b) => ({
        id: b.id,
        name: b.batch_name,
        programId: b.program_id,
      })),
      statuses: Object.values(withdrawal_status_enum),
    };
  }

  /** One request with the trainer's decision, the checklist and the full history. */
  async getForRegistrar(requestId: string) {
    const row = await this.prisma.withdrawal_request.findUnique({
      where: { withdrawal_request_id: requestId },
      include: registrarDetailInclude,
    });
    if (!row) throw new NotFoundException('Withdrawal request not found');
    return this.serializeRegistrarDetail(row);
  }

  /**
   * Second validation step. Only a request the trainer already approved
   * (TRAINER_VALIDATED) can be validated: a request still with the trainer
   * gives 400. Approve needs both checklist items ticked (finances cleared,
   * documents submitted) and moves the request on to the admin
   * (PENDING_ADMIN_SIGNOFF). Reject ends it (REJECTED), needs a reason and is
   * final for that request. The registrar never touches
   * `surrendered_id`: the trainee hands in the ID after the request is accepted,
   * so the admin confirms it at sign-off.
   */
  async validateByRegistrar(
    userId: string,
    requestId: string,
    dto: ValidateWithdrawalRegistrarDto,
  ) {
    const approve = dto.action === 'APPROVE';
    const next = approve
      ? withdrawal_status_enum.PENDING_ADMIN_SIGNOFF
      : withdrawal_status_enum.REJECTED;

    await this.prisma.$transaction(async (tx) => {
      const exists = await tx.withdrawal_request.findUnique({
        where: { withdrawal_request_id: requestId },
        select: { withdrawal_request_id: true },
      });
      if (!exists) throw new NotFoundException('Withdrawal request not found');

      if (approve && !(dto.finances_cleared && dto.documents_submitted)) {
        throw new BadRequestException(
          'Both checklist items must be confirmed before approving',
        );
      }

      // Conditional update: if two registrars act at the same moment, only one
      // write wins and the other gets a clean 400.
      const updated = await tx.withdrawal_request.updateMany({
        where: {
          withdrawal_request_id: requestId,
          withdrawal_status: withdrawal_status_enum.TRAINER_VALIDATED,
        },
        data: {
          withdrawal_status: next,
          finances_cleared: dto.finances_cleared,
          documents_submitted: dto.documents_submitted,
          registrar_validated_by: userId,
          registrar_validated_at: new Date(),
          registrar_remarks: dto.remarks ?? null,
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          'Only a request that is waiting for the registrar can be validated',
        );
      }
      await tx.withdrawal_status_history.create({
        data: {
          withdrawal_request_id: requestId,
          old_status: withdrawal_status_enum.TRAINER_VALIDATED,
          new_status: next,
          changed_by: userId,
          remarks: dto.remarks ?? null,
        },
      });
    });

    return this.getForRegistrar(requestId);
  }

  // ------------------------------------------------------------------ admin

  /**
   * Every request, not scoped to a batch. Left without a status it shows what
   * waits for the admin (PENDING_ADMIN_SIGNOFF); `ALL` shows every status. Each
   * row also says what the trainer and the registrar decided.
   */
  async listForAdmin(query: AdminWithdrawalQueryDto) {
    return this.listAllRequests(
      query,
      withdrawal_status_enum.PENDING_ADMIN_SIGNOFF,
      (row) => this.serializeAdminListRow(row),
    );
  }

  /** Programs, batches and statuses for the list filters. Same options as the registrar's. */
  async getAdminFilterOptions() {
    return this.getRegistrarFilterOptions();
  }

  /**
   * One request with everything the admin reviews: the trainee and enrollment,
   * the trainer's decision, the registrar's two checks, the ID confirmation
   * (once signed off) and the full history.
   */
  async getForAdmin(requestId: string) {
    const row = await this.prisma.withdrawal_request.findUnique({
      where: { withdrawal_request_id: requestId },
      include: registrarDetailInclude,
    });
    if (!row) throw new NotFoundException('Withdrawal request not found');
    return this.serializeAdminDetail(row);
  }

  /**
   * Final step. Only a request both the trainer and then the registrar
   * approved (PENDING_ADMIN_SIGNOFF) can be signed off: anything else gives
   * 400. Approve needs `surrendered_id = true`, sets the request to APPROVED
   * and the enrollment to WITHDRAWN. Reject sets the request to REJECTED and
   * leaves the enrollment alone. Both write a history row, all in one
   * transaction, so the request and the enrollment never disagree.
   */
  async signOffByAdmin(
    userId: string,
    requestId: string,
    dto: AdminSignoffDto,
  ) {
    const approve = dto.action === 'APPROVE';
    const next = approve
      ? withdrawal_status_enum.APPROVED
      : withdrawal_status_enum.REJECTED;

    await this.prisma.$transaction(async (tx) => {
      const request = await tx.withdrawal_request.findUnique({
        where: { withdrawal_request_id: requestId },
        select: {
          enrollment_id: true,
          enrollments: { select: { enrollment_status: true } },
        },
      });
      if (!request) throw new NotFoundException('Withdrawal request not found');

      if (approve && dto.surrendered_id !== true) {
        throw new BadRequestException(
          'Confirm that the trainee surrendered their ID before approving',
        );
      }

      // Conditional update: if two admins act at the same moment, only one
      // write wins and the other gets a clean 400.
      const updated = await tx.withdrawal_request.updateMany({
        where: {
          withdrawal_request_id: requestId,
          withdrawal_status: withdrawal_status_enum.PENDING_ADMIN_SIGNOFF,
        },
        data: {
          withdrawal_status: next,
          ...(dto.surrendered_id !== undefined
            ? { surrendered_id: dto.surrendered_id }
            : {}),
          admin_signed_off_by: userId,
          admin_signed_off_at: new Date(),
          admin_remarks: dto.remarks ?? null,
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          'Only a request that is waiting for the admin can be signed off',
        );
      }

      if (approve) {
        // A finished or dropped enrollment must not be turned back into WITHDRAWN.
        const current = request.enrollments.enrollment_status;
        if (
          current === enrollment_status_enum.COMPLETED ||
          current === enrollment_status_enum.DROPPED
        ) {
          throw new ConflictException(
            `This enrollment is already ${current.toLowerCase()}, so it cannot be withdrawn`,
          );
        }
        // TODO: Account deactivation after withdrawal — decision pending
        // (backlogs/to-be-discussed.md item 9). For now only the enrollment is
        // withdrawn and the trainee's account stays as it is (option A).
        // `users.is_active` already exists and login rejects inactive accounts,
        // so option B or C needs no schema change.
        await tx.enrollments.update({
          where: { id: request.enrollment_id },
          data: { enrollment_status: enrollment_status_enum.WITHDRAWN },
        });
      }

      await tx.withdrawal_status_history.create({
        data: {
          withdrawal_request_id: requestId,
          old_status: withdrawal_status_enum.PENDING_ADMIN_SIGNOFF,
          new_status: next,
          changed_by: userId,
          remarks: dto.remarks ?? null,
        },
      });
    });

    return this.getForAdmin(requestId);
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
      ...this.serializePipeline(row),
    };
  }

  private serializeTrainerListRow(row: TrainerListRow) {
    const user = row.enrollments.trainee.users;
    return {
      id: row.withdrawal_request_id,
      status: row.withdrawal_status,
      reason: row.requested_reason,
      dateRequested: row.date_requested.toISOString().slice(0, 10),
      trainee: {
        name: user ? actorName(user) : null,
        systemId: user?.system_id ?? null,
      },
      enrollment: {
        id: row.enrollments.id,
        status: row.enrollments.enrollment_status,
        batchId: row.enrollments.batch.id,
        batchName: row.enrollments.batch.batch_name,
        programName: row.enrollments.batch.programs.name,
      },
    };
  }

  private serializeTrainerDetail(row: TrainerDetailRow) {
    return {
      ...this.serializeTrainerListRow(row),
      ...this.serializePipeline(row),
    };
  }

  private serializeRegistrarListRow(row: RegistrarListRow) {
    const user = row.enrollments.trainee.users;
    return {
      id: row.withdrawal_request_id,
      status: row.withdrawal_status,
      reason: row.requested_reason,
      dateRequested: row.date_requested.toISOString().slice(0, 10),
      trainee: {
        name: user ? actorName(user) : null,
        systemId: user?.system_id ?? null,
      },
      enrollment: {
        id: row.enrollments.id,
        status: row.enrollments.enrollment_status,
        batchId: row.enrollments.batch.id,
        batchName: row.enrollments.batch.batch_name,
        programId: row.enrollments.batch.programs.id,
        programName: row.enrollments.batch.programs.name,
      },
    };
  }

  /**
   * Detail for the registrar: the list row, the pipeline, the trainer's
   * remarks, the registrar's own two checks, whether the enrollment fee is
   * paid, and the trainee's document progress from the Requirements feature (information only,
   * 6 documents).
   */
  private serializeRegistrarDetail(row: RegistrarDetailRow) {
    const checklist = row.enrollments.requirement_checklist;
    const missing = REQUIREMENT_DOCUMENTS.filter(
      (doc) => !(checklist?.[doc.key] ?? false),
    ).map((doc) => ({ key: doc.key, label: doc.label }));
    // Oldest first. The enrollment fee is the first receipt with that reason.
    const receipts = row.enrollments.official_receipts;
    const receipt =
      receipts.find((r) => r.reason_of_dues === 'ENROLLMENT') ?? null;
    return {
      ...this.serializeRegistrarListRow(row),
      ...this.serializePipeline(row),
      trainerRemarks: row.trainer_remarks,
      checklist: {
        financesCleared: row.finances_cleared,
        documentsSubmitted: row.documents_submitted,
        remarks: row.registrar_remarks,
      },
      enrollmentFee: {
        paid: receipt !== null,
        receipt: receipt
          ? {
              orNumber: receipt.or_number,
              paymentDate: receipt.payment_date.toISOString().slice(0, 10),
              amount: receipt.amount.toString(),
            }
          : null,
        // Every payment of this enrollment, oldest first, for the pop-up.
        payments: receipts.map((r) => ({
          orNumber: r.or_number,
          paymentDate: r.payment_date.toISOString().slice(0, 10),
          amount: r.amount.toString(),
          method: r.payment_method,
          reason: r.reason_of_dues,
        })),
      },
      requirements: {
        submitted: REQUIREMENT_DOCUMENTS.length - missing.length,
        total: REQUIREMENT_DOCUMENTS.length,
        missing,
      },
    };
  }

  /** The registrar's list row plus what the trainer and the registrar decided. */
  private serializeAdminListRow(row: RegistrarListRow) {
    return {
      ...this.serializeRegistrarListRow(row),
      trainerStatus: trainerDecision(row),
      registrarStatus: registrarDecision(row),
    };
  }

  /**
   * Detail for the admin: everything the registrar sees (trainer remarks, the
   * registrar's checks, fee and document progress, for information), plus both
   * validators' decisions, the ID confirmation and the admin's own remarks.
   */
  private serializeAdminDetail(row: RegistrarDetailRow) {
    return {
      ...this.serializeRegistrarDetail(row),
      trainerStatus: trainerDecision(row),
      registrarStatus: registrarDecision(row),
      idSurrendered: row.surrendered_id,
      adminRemarks: row.admin_remarks,
    };
  }

  /** Stages and history, the same for every role that can open a request. */
  private serializePipeline(row: PipelineRow) {
    return {
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
