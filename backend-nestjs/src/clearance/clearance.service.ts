import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  certificate_type_enum,
  clearance_request_status_enum,
  clearance_status_enum,
  enrollment_status_enum,
  Prisma,
  request_status_enum,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CLEARANCE_ENROLLMENT_STATUSES,
  CONTROL_NUMBER_PREFIX,
  OPEN_CLEARANCE_STATUSES,
  REQUESTABLE_CERTIFICATES,
} from './clearance.constants';
import { ClearanceQueryDto } from './dto/clearance-query.dto';
import { CreateClearanceRequestDto } from './dto/create-clearance-request.dto';

/**
 * Clearance and certificate request pipeline:
 * PENDING_VALIDATION -> trainer -> TRAINER_VALIDATED -> registrar ->
 * REGISTRAR_VALIDATED -> encoder -> PROCESSED -> encoder -> RELEASED.
 * The trainer and the registrar can REJECT, and the trainee can CANCEL while
 * the request is still PENDING_VALIDATION.
 *
 * This service is shared by every role. MP-60 holds the trainee side.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const NOT_YOUR_REQUEST = 'You can only open your own clearance requests';
const ALREADY_OPEN =
  'A clearance request is already in progress for this enrollment';

/** Name and role only. Never `password_hash` or contact details. */
const actorSelect = {
  select: { first_name: true, last_name: true, role: true },
} satisfies Prisma.usersDefaultArgs;

/** What the form prints about the trainee. No parents, beneficiary or insurance data. */
const formEnrollmentSelect = {
  id: true,
  enrollment_status: true,
  batch: {
    select: {
      batch_name: true,
      end_date: true,
      programs: { select: { name: true } },
      trainer: {
        select: { users: { select: { first_name: true, last_name: true } } },
      },
    },
  },
  trainee: {
    select: {
      contact_number: true,
      street_address: true,
      barangay: true,
      municipality: true,
      province: true,
      users: {
        select: {
          first_name: true,
          middle_name: true,
          last_name: true,
          system_id: true,
        },
      },
    },
  },
} satisfies Prisma.enrollmentsSelect;

const certificatesSelect = {
  select: {
    other_specify: true,
    certificate_type: { select: { type: true } },
  },
} satisfies Prisma.clearance$clearance_certificateArgs;

const listSelect = {
  id: true,
  control_number: true,
  pipeline_status: true,
  requested_at: true,
  enrollments: {
    select: {
      id: true,
      batch: {
        select: { batch_name: true, programs: { select: { name: true } } },
      },
    },
  },
  clearance: { select: { clearance_certificate: certificatesSelect } },
} satisfies Prisma.request_formSelect;

const detailSelect = {
  id: true,
  control_number: true,
  pipeline_status: true,
  requested_at: true,
  purpose_of_request: true,
  certified: true,
  certified_at: true,
  enrollments: { select: formEnrollmentSelect },
  clearance: {
    select: {
      clearance_status: true,
      surrendered_id: true,
      schedule: true,
      date_released: true,
      trainer_validated_at: true,
      registrar_validated_at: true,
      encoder_processed_at: true,
      trainer_validator: actorSelect,
      registrar_validator: actorSelect,
      encoder_processor: actorSelect,
      users: actorSelect,
      clearance_certificate: certificatesSelect,
    },
  },
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
} satisfies Prisma.request_formSelect;

type ListRow = Prisma.request_formGetPayload<{ select: typeof listSelect }>;
type DetailRow = Prisma.request_formGetPayload<{ select: typeof detailSelect }>;
type FormEnrollment = Prisma.enrollmentsGetPayload<{
  select: typeof formEnrollmentSelect;
}>;

function fullName(
  person: {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
  } | null,
): string | null {
  if (!person) return null;
  return [person.first_name, person.middle_name, person.last_name]
    .filter((part) => part?.trim())
    .join(' ');
}

function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

@Injectable()
export class ClearanceService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- trainee

  /**
   * The read-only part of the form for each of the trainee's enrollments that
   * can ask for a clearance, and whether one already has an open request.
   */
  async getFormOptionsForTrainee(userId: string) {
    const traineeId = await this.requireTraineeId(userId);
    const rows = await this.prisma.enrollments.findMany({
      where: {
        trainee_id: traineeId,
        enrollment_status: { in: CLEARANCE_ENROLLMENT_STATUSES },
      },
      select: {
        ...formEnrollmentSelect,
        request_form: {
          where: { pipeline_status: { in: OPEN_CLEARANCE_STATUSES } },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ enrolled_at: 'desc' }, { id: 'desc' }],
    });

    return {
      enrollments: rows.map((row) => ({
        ...this.serializeFormEnrollment(row),
        openRequestId: row.request_form[0]?.id ?? null,
      })),
    };
  }

  /** Submit the form for one of the trainee's own enrollments. */
  async createForTrainee(userId: string, dto: CreateClearanceRequestDto) {
    const traineeId = await this.requireTraineeId(userId);
    // Printed order, whatever order the client sent. The first one fills the
    // schema's required request_form.certificate_type_id.
    const chosen = REQUESTABLE_CERTIFICATES.filter((type) =>
      dto.certificates.includes(type),
    );
    const otherText = chosen.includes(certificate_type_enum.OTHER)
      ? (dto.other_specify ?? null)
      : null;

    const requestId = await this.prisma.$transaction(async (tx) => {
      // Lock the enrollment row: a second submit for the same enrollment waits
      // here, then sees the first request. Other enrollments are not blocked.
      await tx.$queryRaw`SELECT id FROM enrollments WHERE id = ${dto.enrollment_id}::uuid FOR UPDATE`;

      const enrollment = await tx.enrollments.findUnique({
        where: { id: dto.enrollment_id },
        select: { id: true, trainee_id: true, enrollment_status: true },
      });
      // Same answer for "missing" and "someone else's": do not reveal which.
      if (!enrollment || enrollment.trainee_id !== traineeId) {
        throw new ForbiddenException(
          'You can only request a clearance for your own enrollment',
        );
      }
      this.assertCanRequest(enrollment.enrollment_status);

      const open = await tx.request_form.findFirst({
        where: {
          enrollment_id: enrollment.id,
          pipeline_status: { in: OPEN_CLEARANCE_STATUSES },
        },
        select: { id: true },
      });
      if (open) throw new ConflictException(ALREADY_OPEN);

      const types = await tx.certificate_type.findMany({
        where: { type: { in: chosen } },
        select: { certificate_type_id: true, type: true },
      });
      const typeIds = chosen.map((type) => {
        const found = types.find((row) => row.type === type);
        if (!found) {
          throw new InternalServerErrorException(
            'The certificate types are not set up. Please contact the school.',
          );
        }
        return { type, id: found.certificate_type_id };
      });

      const now = new Date();
      const request = await tx.request_form.create({
        data: {
          enrollment_id: enrollment.id,
          certificate_type_id: typeIds[0].id,
          other_specify: otherText,
          purpose_of_request: dto.purpose_of_request,
          control_number: await this.nextControlNumber(tx),
          pipeline_status: clearance_request_status_enum.PENDING_VALIDATION,
          certified: true,
          certified_at: now,
          requested_at: now,
        },
        select: { id: true },
      });
      await tx.clearance.create({
        data: {
          request_form_id: request.id,
          enrollment_id: enrollment.id,
          clearance_status: clearance_status_enum.PENDING,
          clearance_certificate: {
            create: typeIds.map(({ type, id }) => ({
              certificate_type_id: id,
              other_specify:
                type === certificate_type_enum.OTHER ? otherText : null,
            })),
          },
        },
        select: { id: true },
      });
      await tx.clearance_status_history.create({
        data: {
          request_form_id: request.id,
          old_status: null,
          new_status: clearance_request_status_enum.PENDING_VALIDATION,
          changed_by: userId,
        },
      });
      return request.id;
    });

    return this.getForTrainee(userId, requestId);
  }

  /** The trainee's own requests, newest first. */
  async listForTrainee(userId: string, query: ClearanceQueryDto) {
    const traineeId = await this.requireTraineeId(userId);
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const where: Prisma.request_formWhereInput = {
      enrollments: { trainee_id: traineeId },
      // A row without a status predates this pipeline and is not shown.
      pipeline_status: query.status ?? { not: null },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.request_form.findMany({
        where,
        select: listSelect,
        orderBy: [{ requested_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.request_form.count({ where }),
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
    const row = await this.prisma.request_form.findFirst({
      where: {
        id: requestId,
        enrollments: { trainee_id: traineeId },
        pipeline_status: { not: null },
      },
      select: detailSelect,
    });
    // Someone else's request looks exactly like a missing one.
    if (!row) throw new ForbiddenException(NOT_YOUR_REQUEST);
    return this.serializeDetail(row);
  }

  /** Cancel a request. Only allowed before the trainer has acted on it. */
  async cancelForTrainee(userId: string, requestId: string) {
    const traineeId = await this.requireTraineeId(userId);

    await this.prisma.$transaction(async (tx) => {
      const own = await tx.request_form.findFirst({
        where: { id: requestId, enrollments: { trainee_id: traineeId } },
        select: { id: true },
      });
      if (!own) throw new ForbiddenException(NOT_YOUR_REQUEST);

      // Conditional update: if the trainer acts at the same moment, only one
      // of the two writes wins.
      const updated = await tx.request_form.updateMany({
        where: {
          id: requestId,
          pipeline_status: clearance_request_status_enum.PENDING_VALIDATION,
        },
        data: {
          pipeline_status: clearance_request_status_enum.CANCELLED,
          request_status: request_status_enum.CANCELLED,
        },
      });
      if (updated.count === 0) {
        throw new BadRequestException(
          'Only a request that is still pending validation can be cancelled',
        );
      }
      await tx.clearance_status_history.create({
        data: {
          request_form_id: requestId,
          old_status: clearance_request_status_enum.PENDING_VALIDATION,
          new_status: clearance_request_status_enum.CANCELLED,
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

  private assertCanRequest(status: enrollment_status_enum): void {
    if (!CLEARANCE_ENROLLMENT_STATUSES.includes(status)) {
      throw new BadRequestException(
        'Only an enrolled or completed enrollment can request a clearance',
      );
    }
  }

  /**
   * The next number of a database sequence, so two submits at the same moment
   * never get the same one. A rolled back submit leaves a gap.
   */
  private async nextControlNumber(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const [row] = await tx.$queryRaw<
      { value: bigint }[]
    >`SELECT nextval('clearance_control_number_seq') AS value`;
    return `${CONTROL_NUMBER_PREFIX}${row.value.toString()}`;
  }

  private serializeCertificates(row: ListRow['clearance']) {
    const chosen = row?.clearance_certificate ?? [];
    return REQUESTABLE_CERTIFICATES.flatMap((type) => {
      const match = chosen.find((c) => c.certificate_type.type === type);
      return match ? [{ type, otherSpecify: match.other_specify }] : [];
    });
  }

  private serializeFormEnrollment(row: FormEnrollment) {
    const { trainee, batch } = row;
    return {
      enrollmentId: row.id,
      enrollmentStatus: row.enrollment_status,
      programName: batch.programs.name,
      batchName: batch.batch_name,
      // The schema has no completion date: the batch's end date stands in for
      // it once the enrollment is completed.
      dateCompleted:
        row.enrollment_status === enrollment_status_enum.COMPLETED
          ? dateOnly(batch.end_date)
          : null,
      trainerName: fullName(batch.trainer.users),
      trainee: {
        name: fullName(trainee.users),
        systemId: trainee.users?.system_id ?? null,
        contactNumber: trainee.contact_number,
        address: [
          trainee.street_address,
          trainee.barangay,
          trainee.municipality,
          trainee.province,
        ]
          .filter((part) => part?.trim())
          .join(', '),
      },
    };
  }

  private serializeListRow(row: ListRow) {
    return {
      id: row.id,
      controlNumber: row.control_number,
      status: row.pipeline_status,
      requestedAt: row.requested_at,
      certificates: this.serializeCertificates(row.clearance),
      programName: row.enrollments.batch.programs.name,
      batchName: row.enrollments.batch.batch_name,
    };
  }

  /**
   * Detail = the filled-in form, who acted at each stage, and the history. A
   * rejection reason travels in the history row's remarks.
   */
  private serializeDetail(row: DetailRow) {
    const clearance = row.clearance;
    const stage = (
      actor: { first_name: string; last_name: string } | null | undefined,
      at: Date | null | undefined,
    ) => ({ by: fullName(actor ?? null), at: at ?? null });

    return {
      id: row.id,
      controlNumber: row.control_number,
      status: row.pipeline_status,
      requestedAt: row.requested_at,
      purpose: row.purpose_of_request,
      certified: row.certified,
      certifiedAt: row.certified_at,
      certificates: this.serializeCertificates(clearance),
      form: this.serializeFormEnrollment(row.enrollments),
      clearanceStatus: clearance?.clearance_status ?? null,
      idSurrendered: clearance?.surrendered_id ?? false,
      scheduleReleaseDate: dateOnly(clearance?.schedule),
      dateReleased: dateOnly(clearance?.date_released),
      stages: {
        trainer: stage(
          clearance?.trainer_validator,
          clearance?.trainer_validated_at,
        ),
        registrar: stage(
          clearance?.registrar_validator,
          clearance?.registrar_validated_at,
        ),
        encoder: stage(
          clearance?.encoder_processor,
          clearance?.encoder_processed_at,
        ),
        // date_released is a calendar date; the exact time is in the history.
        release: stage(clearance?.users, clearance?.date_released),
      },
      history: row.status_history.map((entry) => ({
        id: entry.id,
        oldStatus: entry.old_status,
        newStatus: entry.new_status,
        changedAt: entry.changed_at,
        remarks: entry.remarks,
        changedBy: {
          name: fullName(entry.changed_by_user),
          role: entry.changed_by_user.role,
        },
      })),
    };
  }
}
