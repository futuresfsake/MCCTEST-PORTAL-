import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { RequirementsService } from '../requirements/requirements.service';
import {
  toDateOnly,
  toTimeOfDay,
} from '../trainee-information/trainee-information.service';
import {
  CreateEnrollmentDto,
  EnrollmentPaymentDto,
  TraineeDetailsDto,
  TraineeInfoDto,
  RequirementChecklistDto,
} from './dto/create-enrollment.dto';
import { ChangeBatchDto, ChangeProgramDto } from './dto/change-enrollment.dto';
import { UpdateTraineeDto } from './dto/update-trainee.dto';
import {
  UpdateEnrollmentStatusDto,
  EnrollmentFilterDto,
} from './dto/update-enrollment.dto';
import { Prisma } from '../generated/prisma/client';
import {
  day_enum,
  enrollment_status_enum,
  enrollment_transfer_type_enum,
  size_enum,
} from '../generated/prisma/enums';
import { generateOrNumber } from '../payments/or-number';

/** Initial portal password for new trainee accounts (shown once on the success screen). */
const DEFAULT_TRAINEE_PASSWORD = 'traineedefault';

const ACTIVE_ENROLLMENT_STATUSES: enrollment_status_enum[] = [
  'PENDING',
  'ENROLLED',
];

const EMAIL_IN_USE_MESSAGE = 'This email is already used by another account.';

/** Statuses that mean the trainee left the batch early */
const EXIT_ENROLLMENT_STATUSES: enrollment_status_enum[] = [
  'WITHDRAWN',
  'DROPPED',
];

/** Batch fields needed to apply the program rules. */
const programRuleBatchSelect = {
  start_date: true,
  end_date: true,
  programs: {
    select: {
      id: true,
      name: true,
      is_accredited: true,
      program_schedule: {
        select: { days: true, start_time: true, end_time: true },
      },
    },
  },
} as const;

type ProgramRuleBatch = {
  start_date: Date;
  end_date: Date;
  programs: {
    id: string;
    name: string;
    is_accredited: boolean;
    program_schedule: { days: day_enum[]; start_time: Date; end_time: Date }[];
  };
};

/**
 * Checks a candidate batch against the trainee's active enrollments and
 * returns the reason it is not allowed, or null if it is allowed:
 * - no second active enrollment in the same program
 * - at most one active accredited program
 * - non-accredited programs are unlimited, but no schedule may overlap
 *   any active enrollment (accredited or not)
 */
function findProgramRuleConflict(
  activeBatches: ProgramRuleBatch[],
  candidate: ProgramRuleBatch,
): string | null {
  for (const current of activeBatches) {
    if (current.programs.id === candidate.programs.id) {
      return `This trainee already has an active enrollment in ${current.programs.name}.`;
    }

    if (current.programs.is_accredited && candidate.programs.is_accredited) {
      return `This trainee is already enrolled in the accredited program ${current.programs.name}. Only one active accredited program is allowed at a time.`;
    }

    const datesOverlap =
      current.start_date <= candidate.end_date &&
      candidate.start_date <= current.end_date;
    // A conflict needs one schedule pair that shares a day AND overlaps in time.
    const scheduleOverlap =
      datesOverlap &&
      current.programs.program_schedule.some((currentSchedule) =>
        candidate.programs.program_schedule.some(
          (candidateSchedule) =>
            currentSchedule.days.some((day) =>
              candidateSchedule.days.includes(day),
            ) &&
            currentSchedule.start_time < candidateSchedule.end_time &&
            candidateSchedule.start_time < currentSchedule.end_time,
        ),
      );
    if (scheduleOverlap) {
      return `Schedule conflict: ${current.programs.name} overlaps the selected program's schedule.`;
    }
  }

  return null;
}

/**
 * The local calendar day of `date` (plus `addYears`) as UTC midnight, which is
 * how Prisma reads and writes @db.Date columns. Using the local day keeps the
 * stored date the same as the day the registrar sees.
 */
function localCalendarDay(date: Date, addYears = 0): Date {
  return new Date(
    Date.UTC(date.getFullYear() + addYears, date.getMonth(), date.getDate()),
  );
}

/** Lowercase letters only: accents and ñ are folded, everything else is dropped. */
function toUsernamePart(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
}

/**
 * Whether Postgres cancelled the transaction because it clashed with another.
 * During the transaction this arrives as P2034. At commit it arrives as the
 * driver adapter's own error, which has no Prisma code.
 */
function isWriteConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === 'P2034') return true;
  const cause = 'cause' in error ? error.cause : undefined;
  return (
    typeof cause === 'object' &&
    cause !== null &&
    'kind' in cause &&
    cause.kind === 'TransactionWriteConflict'
  );
}

function isUniqueViolation(error: unknown): error is { meta?: unknown } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

/** Whether a unique-violation error mentions the given column. */
function uniqueViolationMentions(error: { meta?: unknown }, column: string) {
  return JSON.stringify(error.meta ?? {}).includes(column);
}

/** Rejects anything but a real calendar date (YYYY-MM-DD) up to today. */
function assertValidBirthDate(dateOfBirth: string) {
  const dateParts = dateOfBirth.split('-').map(Number);
  const parsedDateOfBirth = new Date(
    Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]),
  );
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const normalizedDateOfBirth = Date.UTC(
    parsedDateOfBirth.getUTCFullYear(),
    parsedDateOfBirth.getUTCMonth(),
    parsedDateOfBirth.getUTCDate(),
  );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ||
    Number.isNaN(normalizedDateOfBirth) ||
    parsedDateOfBirth.getUTCFullYear() !== dateParts[0] ||
    parsedDateOfBirth.getUTCMonth() !== dateParts[1] - 1 ||
    parsedDateOfBirth.getUTCDate() !== dateParts[2] ||
    normalizedDateOfBirth > todayUtc
  ) {
    throw new BadRequestException(
      'Date of birth must be a valid calendar date that is not in the future.',
    );
  }
}

/** What a batch or program change needs to know about the enrollment. */
const movableEnrollmentSelect = {
  id: true,
  trainee_id: true,
  batch_id: true,
  enrollment_status: true,
  uniform_size: true,
  batch: {
    select: {
      id: true,
      batch_name: true,
      program_id: true,
      programs: { select: { name: true } },
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
      commitment_fee: true,
      remarks: true,
    },
  },
} satisfies Prisma.enrollmentsSelect;

const transferBatchSelect = {
  select: {
    id: true,
    batch_name: true,
    programs: { select: { name: true } },
  },
} satisfies Prisma.batchDefaultArgs;

/** One history row. Only the admin's name is read from the account. */
const transferHistorySelect = {
  id: true,
  type: true,
  reason: true,
  created_at: true,
  from_enrollment_id: true,
  to_enrollment_id: true,
  from_batch: transferBatchSelect,
  to_batch: transferBatchSelect,
  users: { select: { first_name: true, last_name: true } },
} satisfies Prisma.enrollment_transfersSelect;

type TransferHistoryRow = Prisma.enrollment_transfersGetPayload<{
  select: typeof transferHistorySelect;
}>;

function toChangeHistoryEntry(row: TransferHistoryRow) {
  return {
    id: row.id,
    type: row.type,
    reason: row.reason,
    createdAt: row.created_at,
    performedBy: `${row.users.first_name} ${row.users.last_name}`.trim(),
    from: {
      enrollmentId: row.from_enrollment_id,
      batchId: row.from_batch.id,
      batchName: row.from_batch.batch_name,
      programName: row.from_batch.programs.name,
    },
    to: {
      enrollmentId: row.to_enrollment_id,
      batchId: row.to_batch.id,
      batchName: row.to_batch.batch_name,
      programName: row.to_batch.programs.name,
    },
  };
}

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly requirementsService: RequirementsService,
  ) {}

  async searchTrainees(query: string) {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();

    return this.prisma.trainee
      .findMany({
        where: {
          OR: [
            {
              users: {
                first_name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              users: {
                last_name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              users: {
                middle_name: {
                  contains: searchTerm,
                  mode: 'insensitive',
                },
              },
            },
            {
              contact_number: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        },
        select: {
          id: true,
          users: {
            select: {
              first_name: true,
              last_name: true,
              middle_name: true,
            },
          },
          contact_number: true,
          street_address: true,
          barangay: true,
          municipality: true,
          district: true,
          province: true,
          date_of_birth: true,
          place_of_birth: true,
          citizenship: true,
          mother_name: true,
          father_name: true,
          civil_status: true,
          highest_education: true,
          employment_status: true,
          employment_type: true,
          pwd: true,
          gender: true,
          trainee_beneficiaries: {
            select: {
              first_name: true,
              middle_name: true,
              last_name: true,
              relationship: true,
              contact_number: true,
              address: true,
              id_number: true,
            },
          },
          insurance_coverage: {
            where: { expiry_date: { gte: localCalendarDay(new Date()) } },
            select: { coverage_id: true },
            take: 1,
          },
        },
        take: 10,
      })
      .then((trainees) =>
        trainees.map(({ insurance_coverage, ...trainee }) => ({
          ...trainee,
          hasActiveInsurance: insurance_coverage.length > 0,
        })),
      );
  }

  /**
   * @param movingEnrollmentId the enrollment the trainee is leaving, for a batch
   * or program change. It does not count against the rules, because it will no
   * longer be active in that batch afterwards.
   */
  async getAvailableBatches(traineeId?: string, movingEnrollmentId?: string) {
    const today = localCalendarDay(new Date());

    const traineeEnrollments = traineeId
      ? await this.prisma.enrollments.findMany({
          where: { trainee_id: traineeId },
          select: {
            id: true,
            batch_id: true,
            enrollment_status: true,
            batch: { select: programRuleBatchSelect },
          },
        })
      : [];
    const pastBatchIds = new Set(traineeEnrollments.map((e) => e.batch_id));
    const activeBatches = traineeEnrollments
      .filter(
        (e) =>
          ACTIVE_ENROLLMENT_STATUSES.includes(e.enrollment_status) &&
          e.id !== movingEnrollmentId,
      )
      .map((e) => e.batch);

    const batches = await this.prisma.batch.findMany({
      where: {
        batch_status: 'OPEN',
        end_date: {
          gte: today,
        },
      },
      select: {
        id: true,
        batch_name: true,
        program_id: true,
        capacity: true,
        start_date: true,
        end_date: true,
        batch_status: true,
        programs: {
          select: {
            id: true,
            name: true,
            is_accredited: true,
            is_active: true,
            control_number_prefix: true,
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
            enrollments: {
              where: { enrollment_status: { in: ['PENDING', 'ENROLLED'] } },
            },
          },
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    // Every open batch is returned so the registrar can see why a batch is
    // unavailable; blocked ones carry the same reason createEnrollment gives.
    return batches.map((batch) => {
      const remainingCapacity = batch.capacity - batch._count.enrollments;
      const blockedReason = pastBatchIds.has(batch.id)
        ? 'This trainee has already been enrolled in this batch.'
        : remainingCapacity <= 0
          ? 'This batch is full.'
          : findProgramRuleConflict(activeBatches, batch);

      return {
        ...batch,
        remainingCapacity,
        eligible: !blockedReason,
        blockedReason,
        _count: undefined,
      };
    });
  }

  async getPrograms() {
    return this.prisma.programs.findMany({
      where: { is_active: true },
      select: {
        id: true,
        name: true,
        control_number_prefix: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  private async validateBatchAvailability(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    batchId: string,
  ) {
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        batch_status: true,
        start_date: true,
        end_date: true,
        capacity: true,
        _count: {
          select: {
            enrollments: {
              where: { enrollment_status: { in: ['PENDING', 'ENROLLED'] } },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found.');
    }

    if (batch.batch_status !== 'OPEN') {
      throw new BadRequestException('The selected batch is no longer open.');
    }

    // end_date is a calendar day, so a batch ending today is still running.
    if (batch.end_date < localCalendarDay(new Date())) {
      throw new BadRequestException('The selected batch has already ended.');
    }

    if (batch._count.enrollments >= batch.capacity) {
      throw new BadRequestException(
        'The selected batch is already full. Please select another available batch.',
      );
    }
  }

  private async validateTraineeProgramRules(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeId: string,
    batchId: string,
    movingEnrollmentId?: string,
  ) {
    const selectedBatch = await tx.batch.findUnique({
      where: { id: batchId },
      select: programRuleBatchSelect,
    });
    if (!selectedBatch) throw new NotFoundException('Batch not found.');

    const traineeEnrollments = await tx.enrollments.findMany({
      where: { trainee_id: traineeId },
      select: {
        id: true,
        batch_id: true,
        enrollment_status: true,
        batch: { select: programRuleBatchSelect },
      },
    });

    if (traineeEnrollments.some((e) => e.batch_id === batchId)) {
      throw new ConflictException(
        'Enrollment rejected: this trainee has already been enrolled in the selected batch.',
      );
    }

    const conflict = findProgramRuleConflict(
      traineeEnrollments
        .filter(
          (e) =>
            ACTIVE_ENROLLMENT_STATUSES.includes(e.enrollment_status) &&
            e.id !== movingEnrollmentId,
        )
        .map((e) => e.batch),
      selectedBatch,
    );
    if (conflict) throw new ConflictException(conflict);
  }

  private async generateIdCardNumber(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    programId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();

    const program = await tx.programs.findUnique({
      where: { id: programId },
      select: { control_number_prefix: true },
    });

    if (!program) {
      throw new NotFoundException('Program not found.');
    }

    const updatedSeq = await tx.batch_seq.upsert({
      where: {
        program_id_year: {
          program_id: programId,
          year,
        },
      },
      update: {
        last_sequence: {
          increment: 1,
        },
      },
      create: {
        program_id: programId,
        year,
        last_sequence: 1,
      },
      select: {
        last_sequence: true,
      },
    });

    return `${year}-${program.control_number_prefix}${String(updatedSeq.last_sequence).padStart(3, '0')}`;
  }

  /**
   * Builds a trainee username: first3.lastname_mcctest (lowercase, letters
   * only, full last name). On collision a number is appended:
   * che.colaljo_mcctest2, che.colaljo_mcctest3, ...
   */
  private async generateTraineeUsername(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const first = toUsernamePart(firstName).slice(0, 3);
    const last = toUsernamePart(lastName);
    if (!first || !last) {
      throw new BadRequestException(
        'The trainee first and last name must contain letters to generate a username.',
      );
    }

    const base = `${first}.${last}_mcctest`;
    const taken = new Set(
      (
        await tx.users.findMany({
          where: { system_id: { startsWith: base } },
          select: { system_id: true },
        })
      ).map((user) => user.system_id),
    );

    if (!taken.has(base)) return base;
    let suffix = 2;
    while (taken.has(`${base}${suffix}`)) suffix += 1;
    return `${base}${suffix}`;
  }

  /** Maps the enrollment form's trainee fields to trainee table columns. */
  private toTraineeRecord(traineeData: TraineeDetailsDto) {
    return {
      contact_number: traineeData.contactNumber,
      street_address: traineeData.streetAddress,
      barangay: traineeData.barangay,
      municipality: traineeData.municipality,
      district: traineeData.district,
      province: traineeData.province,
      gender: traineeData.gender,
      date_of_birth: new Date(traineeData.dateOfBirth),
      place_of_birth: traineeData.placeOfBirth,
      citizenship: traineeData.citizenship || 'FILIPINO',
      mother_name: traineeData.motherName,
      father_name: traineeData.fatherName,
      civil_status: traineeData.civilStatus,
      highest_education: traineeData.highestEducation,
      pwd: traineeData.pwd,
      employment_status: traineeData.employmentStatus,
      employment_type: traineeData.employmentType,
    };
  }

  /**
   * Creates the user account and its one trainee row for a new trainee.
   * Returns the trainee id and the generated portal username.
   */
  private async createTrainee(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeData: TraineeInfoDto,
  ): Promise<{ traineeId: string; username: string }> {
    const user = await tx.users.create({
      data: {
        system_id: await this.generateTraineeUsername(
          tx,
          traineeData.firstName,
          traineeData.lastName,
        ),
        first_name: traineeData.firstName,
        middle_name: traineeData.middleName || '',
        last_name: traineeData.lastName,
        password_hash: await bcrypt.hash(DEFAULT_TRAINEE_PASSWORD, 12),
        role: 'TRAINEE',
      },
      select: { id: true, system_id: true },
    });

    const trainee = await tx.trainee.create({
      data: { users_id: user.id, ...this.toTraineeRecord(traineeData) },
      select: { id: true },
    });
    return { traineeId: trainee.id, username: user.system_id ?? '' };
  }

  private async getTraineeUserId(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeId: string,
  ): Promise<string> {
    const trainee = await tx.trainee.findUnique({
      where: { id: traineeId },
      select: { users_id: true },
    });
    if (!trainee) throw new NotFoundException('Trainee not found.');
    if (!trainee.users_id) {
      throw new BadRequestException(
        'The selected trainee is not linked to a user.',
      );
    }
    return trainee.users_id;
  }

  private async saveBeneficiary(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    traineeId: string,
    beneficiary: {
      firstName: string;
      middleName: string;
      lastName: string;
      relationship: string;
      contactNumber: string;
      address: string;
      idNumber: string;
    },
  ) {
    const data = {
      first_name: beneficiary.firstName,
      middle_name: beneficiary.middleName || '',
      last_name: beneficiary.lastName,
      relationship: beneficiary.relationship,
      contact_number: beneficiary.contactNumber,
      address: beneficiary.address,
      id_number: beneficiary.idNumber,
    };
    return tx.trainee_beneficiaries.upsert({
      where: { trainee_id: traineeId },
      update: data,
      create: { trainee_id: traineeId, ...data },
    });
  }

  /**
   * Updates the trainee's name, and the email when one is given, on their
   * account and returns their portal username.
   */
  private async updateUser(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
    traineeData: TraineeDetailsDto,
    email?: string | null,
  ): Promise<string> {
    const user = await tx.users.update({
      where: { id: userId },
      data: {
        first_name: traineeData.firstName,
        middle_name: traineeData.middleName || '',
        last_name: traineeData.lastName,
        ...(email !== undefined ? { email } : {}),
      },
      select: { system_id: true },
    });
    return user.system_id ?? '';
  }

  /**
   * Writes the enrollment's distribution checklist. A given uniform also takes
   * one off the program's stock and logs it, in the caller's transaction, so
   * running out of stock cancels the whole save.
   */
  private async recordUniformDistribution(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    programId: string,
    uniform: { given: boolean; size: size_enum | null },
    userId: string,
  ) {
    const issuedSize = uniform.given ? uniform.size : null;
    const inventoryId = issuedSize
      ? await this.inventoryService.deductAndLog(
          tx,
          programId,
          issuedSize,
          enrollmentId,
          userId,
        )
      : null;

    await tx.distribution_checklist.create({
      data: {
        enrollment_id: enrollmentId,
        inventory_id: inventoryId,
        uniform_given: Boolean(issuedSize),
        size_issued: issuedSize,
        date_distributed: issuedSize ? new Date() : null,
        distributed_by: issuedSize ? userId : null,
      },
    });
  }

  /**
   * Records an official receipt for the enrollment and, when the trainee has no
   * active insurance, starts their one-year coverage. Returns the OR number.
   */
  private async recordPayment(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
    traineeId: string,
    payment: EnrollmentPaymentDto,
    userId: string,
  ): Promise<string> {
    const paymentDate = new Date();
    // Insurance dates are DATE columns, so compare and store
    // calendar days (the local day, as UTC midnight).
    const coverageToday = localCalendarDay(paymentDate);
    const activeCoverage = await tx.insurance_coverage.findFirst({
      where: {
        trainee_id: traineeId,
        effective_date: { lte: coverageToday },
        expiry_date: { gte: coverageToday },
      },
      select: { coverage_id: true },
    });
    const baseFee = activeCoverage ? 450 : 500;
    const orNumber = await generateOrNumber(tx, paymentDate);
    const receipt = await tx.official_receipts.create({
      data: {
        enrollment_id: enrollmentId,
        or_number: orNumber,
        base_fee: baseFee,
        amount: payment.amount!,
        payment_date: paymentDate,
        payment_method: payment.paymentMethod!,
        reason_of_dues: payment.reasonOfDues || 'ENROLLMENT',
        remarks: payment.remarks,
        confirmed_by: userId,
      },
    });

    if (!activeCoverage) {
      await tx.insurance_coverage.create({
        data: {
          trainee_id: traineeId,
          effective_date: coverageToday,
          // Exactly one year later (previously stored a day short)
          expiry_date: localCalendarDay(paymentDate, 1),
          official_receipt_id: receipt.id,
        },
      });
    }

    return orNumber;
  }

  async createEnrollment(
    createDto: CreateEnrollmentDto,
    enrolledByUserId: string,
  ) {
    const {
      trainee: traineeData,
      batchId,
      requirementChecklist,
      uniformSize,
      uniformGiven,
      remarks,
      payment,
    } = createDto;

    assertValidBirthDate(traineeData.dateOfBirth);

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            await this.validateBatchAvailability(tx, batchId);

            let traineeId: string;
            // Portal login shown on the success screen. The password is only
            // known for a brand-new account; existing trainees keep theirs.
            let portalAccount: {
              username: string;
              isNewAccount: boolean;
              temporaryPassword: string | null;
            };

            if (traineeData.isExistingTrainee && traineeData.id) {
              // Re-enrollment: reuse the person's one trainee row (matched on
              // users_id) and only add a new enrollment row below.
              const userId = await this.getTraineeUserId(tx, traineeData.id);
              await this.validateTraineeProgramRules(
                tx,
                traineeData.id,
                batchId,
              );
              portalAccount = {
                username: await this.updateUser(tx, userId, traineeData),
                isNewAccount: false,
                temporaryPassword: null,
              };
              traineeId = (
                await tx.trainee.update({
                  where: { users_id: userId },
                  data: this.toTraineeRecord(traineeData),
                  select: { id: true },
                })
              ).id;
            } else {
              const duplicateTrainee = await tx.trainee.findFirst({
                where: { contact_number: traineeData.contactNumber },
                select: { id: true },
              });

              if (duplicateTrainee) {
                throw new ConflictException(
                  'A trainee with this contact number already exists. Search and select the existing trainee instead of creating a duplicate.',
                );
              }

              const newTrainee = await this.createTrainee(tx, traineeData);
              traineeId = newTrainee.traineeId;
              portalAccount = {
                username: newTrainee.username,
                isNewAccount: true,
                temporaryPassword: DEFAULT_TRAINEE_PASSWORD,
              };
            }

            await this.saveBeneficiary(tx, traineeId, traineeData.beneficiary);

            const batch = await tx.batch.findUnique({
              where: { id: batchId },
              select: { program_id: true },
            });

            if (!batch) {
              throw new NotFoundException('Batch not found.');
            }

            const idCardNumber = await this.generateIdCardNumber(
              tx,
              batch.program_id,
            );

            const enrollment = await tx.enrollments.create({
              data: {
                trainee_id: traineeId,
                batch_id: batchId,
                enrollment_status: 'ENROLLED',
                uniform_size: uniformSize,
                id_card_number: idCardNumber,
                enrolled_by: enrolledByUserId,
                remarks,
              },
            });

            await this.recordUniformDistribution(
              tx,
              enrollment.id,
              batch.program_id,
              { given: uniformGiven, size: uniformSize },
              enrolledByUserId,
            );

            await tx.requirement_checklist.create({
              data: {
                enrollment_id: enrollment.id,
                checked_by: enrolledByUserId,
                bc_nso_psa_copy: requirementChecklist.bcNsoPsaCopy,
                diploma_tor: requirementChecklist.diplomaTor,
                brgy_clearance: requirementChecklist.brgyClearance,
                one_by_one_pic: requirementChecklist.oneByOnePic,
                two_by_two_pic: requirementChecklist.twoByTwoPic,
                passport_size: requirementChecklist.passportSize,
                commitment_fee: payment.processPayment,
                remarks: requirementChecklist.remarks,
              },
            });

            let orNumber: string | null = null;
            if (payment.processPayment) {
              orNumber = await this.recordPayment(
                tx,
                enrollment.id,
                traineeId,
                payment,
                enrolledByUserId,
              );
            }

            return {
              ...enrollment,
              idCardNumber,
              orNumber,
              portalAccount,
            };
          },
          {
            isolationLevel: 'Serializable',
            // Wait up to 10s for a free connection (Prisma's default is 2s,
            // which fails with P2028 when the shared database is busy).
            maxWait: 10000,
            timeout: 15000,
          },
        );
      } catch (error) {
        const errorCode =
          typeof error === 'object' && error !== null && 'code' in error
            ? error.code
            : undefined;
        // P2034: serialization conflict. P2028: no connection was free in
        // time to start the transaction. Both are safe to retry.
        const isRetryableTransactionError =
          errorCode === 'P2034' || errorCode === 'P2028';
        // Two enrollments for people with the same name can pick the same
        // username at the same moment; retrying picks the next free number.
        const isUsernameRace =
          isUniqueViolation(error) &&
          uniqueViolationMentions(error, 'system_id');
        const canRetry =
          (isRetryableTransactionError || isUsernameRace) &&
          attempt < maxAttempts;

        if (!canRetry) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(
              uniqueViolationMentions(error, 'batch_id')
                ? 'Enrollment rejected: this trainee has already been enrolled in the selected batch.'
                : uniqueViolationMentions(error, 'users_id')
                  ? 'This person already has a trainee record. Search and select the existing trainee instead.'
                  : 'This enrollment conflicts with an existing record. Please refresh and try again.',
            );
          }
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
      }
    }

    throw new Error(
      'Enrollment transaction failed after maximum retry attempts.',
    );
  }

  async getEnrollments(filters: EnrollmentFilterDto) {
    const {
      search,
      batchId,
      programId,
      status,
      startDate,
      endDate,
      skip = 0,
      take = 10,
    } = filters;
    const where: Record<string, any> = {};

    if (search?.trim()) {
      const searchTerm = search.trim();
      const searchConditions: Record<string, any>[] = [
        { id_card_number: { contains: searchTerm, mode: 'insensitive' } },
        {
          trainee: {
            users: {
              first_name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
        {
          trainee: {
            users: {
              last_name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
        {
          trainee: {
            users: {
              middle_name: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
        {
          trainee: {
            contact_number: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          batch: { batch_name: { contains: searchTerm, mode: 'insensitive' } },
        },
        {
          batch: {
            programs: { name: { contains: searchTerm, mode: 'insensitive' } },
          },
        },
        {
          official_receipts: {
            some: {
              or_number: { contains: searchTerm, mode: 'insensitive' },
            },
          },
        },
      ];

      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          searchTerm,
        )
      ) {
        searchConditions.push({ id: { equals: searchTerm } });
      }

      where.OR = searchConditions;
    }

    if (batchId) where.batch_id = batchId;
    if (programId) where.batch = { program_id: programId };
    if (status) where.enrollment_status = status;
    if (startDate || endDate) {
      where.enrolled_at = {};
      if (startDate) where.enrolled_at.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        where.enrolled_at.lt = end;
      }
    }

    const [enrollments, total] = await Promise.all([
      this.prisma.enrollments.findMany({
        where,
        select: {
          id: true,
          enrollment_status: true,
          uniform_size: true,
          id_card_number: true,
          enrolled_at: true,
          remarks: true,
          trainee: {
            select: {
              id: true,
              users: {
                select: {
                  first_name: true,
                  last_name: true,
                  middle_name: true,
                },
              },
              contact_number: true,
            },
          },
          batch: {
            select: {
              id: true,
              batch_name: true,
              start_date: true,
              end_date: true,
              programs: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          official_receipts: {
            select: { or_number: true },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
        orderBy: { enrolled_at: 'desc' },
        skip,
        take,
      }),
      this.prisma.enrollments.count({ where }),
    ]);

    return { data: enrollments, total, skip, take };
  }

  async getEnrollmentDetail(enrollmentId: string) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        enrollment_status: true,
        uniform_size: true,
        id_card_number: true,
        enrolled_at: true,
        remarks: true,
        enrolled_by: true,
        trainee: {
          select: {
            id: true,
            contact_number: true,
            street_address: true,
            barangay: true,
            municipality: true,
            district: true,
            province: true,
            gender: true,
            date_of_birth: true,
            place_of_birth: true,
            citizenship: true,
            mother_name: true,
            father_name: true,
            civil_status: true,
            highest_education: true,
            pwd: true,
            employment_status: true,
            employment_type: true,
            users: {
              select: {
                first_name: true,
                last_name: true,
                middle_name: true,
              },
            },
            // Every program this trainee is enrolled in, one entry per batch
            enrollments: {
              orderBy: { enrolled_at: 'asc' },
              select: {
                id: true,
                enrollment_status: true,
                uniform_size: true,
                id_card_number: true,
                enrolled_at: true,
                batch: {
                  select: {
                    id: true,
                    batch_name: true,
                    start_date: true,
                    end_date: true,
                    programs: {
                      select: { id: true, name: true, is_accredited: true },
                    },
                  },
                },
                official_receipts: {
                  select: { or_number: true },
                  orderBy: { created_at: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            batch_name: true,
            start_date: true,
            end_date: true,
            capacity: true,
            programs: {
              select: {
                id: true,
                name: true,
                is_accredited: true,
              },
            },
          },
        },
        requirement_checklist: {
          select: {
            id: true,
            bc_nso_psa_copy: true,
            diploma_tor: true,
            brgy_clearance: true,
            one_by_one_pic: true,
            two_by_two_pic: true,
            passport_size: true,
            commitment_fee: true,
            remarks: true,
            checked_at: true,
          },
        },
        distribution_checklist: {
          select: {
            id: true,
            uniform_given: true,
            size_issued: true,
            id_card_given: true,
            date_distributed: true,
            remarks: true,
          },
        },
        official_receipts: {
          select: {
            id: true,
            or_number: true,
            amount: true,
            payment_date: true,
            payment_method: true,
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    return enrollment;
  }

  /**
   * Changes an enrollment's status. Putting a withdrawn, dropped or completed
   * enrollment back to PENDING/ENROLLED is checked like a new enrollment
   * (batch still running, a free slot, program rules), so the status
   * dropdown cannot be used to get around those rules.
   */
  async updateEnrollmentStatus(
    enrollmentId: string,
    updateDto: UpdateEnrollmentStatusDto,
  ) {
    const nextStatus = updateDto.status;

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const enrollment = await tx.enrollments.findUnique({
            where: { id: enrollmentId },
            select: {
              id: true,
              trainee_id: true,
              batch_id: true,
              enrollment_status: true,
              remarks: true,
            },
          });

          if (!enrollment) {
            throw new NotFoundException('Enrollment not found.');
          }

          const isReactivation =
            ACTIVE_ENROLLMENT_STATUSES.includes(nextStatus) &&
            !ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.enrollment_status);
          if (isReactivation) {
            await this.validateReactivation(tx, enrollment);
          }

          const exitReason = updateDto.exitReason?.trim();
          const remarks = updateDto.remarks?.trim();

          return tx.enrollments.update({
            where: { id: enrollmentId },
            data: {
              enrollment_status: nextStatus,
              // Added to the existing remarks, never replacing them
              remarks: remarks
                ? [enrollment.remarks, remarks].filter(Boolean).join('\n\n')
                : enrollment.remarks,
              // Keep the reason for leaving; clear it when the trainee returns
              ...(EXIT_ENROLLMENT_STATUSES.includes(nextStatus) && exitReason
                ? { exit_reason: exitReason }
                : {}),
              ...(isReactivation ? { exit_reason: null } : {}),
            },
          });
        },
        { isolationLevel: 'Serializable', maxWait: 10000, timeout: 15000 },
      );
    } catch (error) {
      // P2034: another change to the same batch was saved at the same moment
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Another change to this batch was saved at the same time. Please try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Runs one all-or-nothing save at the strictest isolation, so two saves
   * cannot both take the last slot of a batch. A clash becomes a clear 409.
   */
  private async runSerializable<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: 'Serializable',
        maxWait: 10000,
        timeout: 15000,
      });
    } catch (error) {
      if (isWriteConflict(error)) {
        throw new ConflictException(
          'Another change to this batch was saved at the same time. Please try again.',
        );
      }
      throw error;
    }
  }

  /**
   * Rules for returning an inactive enrollment to PENDING/ENROLLED: the batch
   * must not be closed or cancelled, must have a free slot, and the trainee's
   * other active enrollments must allow it (same rules as enrolling).
   */
  private async validateReactivation(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    enrollment: { id: string; trainee_id: string; batch_id: string },
  ) {
    const batch = await tx.batch.findUnique({
      where: { id: enrollment.batch_id },
      select: {
        ...programRuleBatchSelect,
        batch_status: true,
        capacity: true,
        _count: {
          select: {
            enrollments: {
              where: { enrollment_status: { in: ACTIVE_ENROLLMENT_STATUSES } },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException('Batch not found.');
    }

    if (batch.batch_status === 'CLOSED' || batch.batch_status === 'CANCELLED') {
      throw new BadRequestException(
        `This batch is ${batch.batch_status.toLowerCase()}, so the trainee cannot be put back into it.`,
      );
    }

    if (batch._count.enrollments >= batch.capacity) {
      throw new BadRequestException(
        'This batch is already full, so the trainee cannot be put back into it.',
      );
    }

    const otherActiveEnrollments = await tx.enrollments.findMany({
      where: {
        trainee_id: enrollment.trainee_id,
        id: { not: enrollment.id },
        enrollment_status: { in: ACTIVE_ENROLLMENT_STATUSES },
      },
      select: { batch: { select: programRuleBatchSelect } },
    });

    const conflict = findProgramRuleConflict(
      otherActiveEnrollments.map((e) => e.batch),
      batch,
    );
    if (conflict) throw new ConflictException(conflict);
  }

  /**
   * Saves an edit of an enrollment's submitted documents. Goes through the
   * shared requirements service, so it checks the enrollment, writes history
   * and records who checked. The commitment fee is a payment and is not
   * changed here. Returns the row shape the enrollment detail already uses.
   */
  async updateRequirementChecklist(
    enrollmentId: string,
    checklist: RequirementChecklistDto,
    checkedByUserId: string,
  ) {
    const saved = await this.requirementsService.saveChecklist(
      enrollmentId,
      checklist,
      checkedByUserId,
    );

    return {
      id: saved.id,
      bc_nso_psa_copy: saved.bc_nso_psa_copy,
      diploma_tor: saved.diploma_tor,
      brgy_clearance: saved.brgy_clearance,
      one_by_one_pic: saved.one_by_one_pic,
      two_by_two_pic: saved.two_by_two_pic,
      passport_size: saved.passport_size,
      remarks: saved.remarks,
      checked_at: saved.checked_at,
      users: saved.users,
    };
  }

  /**
   * The admin's Edit Trainee form: account name and email, trainee details and
   * beneficiary, saved together. The username and password are never touched.
   */
  async updateTrainee(traineeId: string, dto: UpdateTraineeDto) {
    assertValidBirthDate(dto.dateOfBirth);

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const userId = await this.getTraineeUserId(tx, traineeId);

          if (dto.email) {
            const emailOwner = await tx.users.findFirst({
              where: {
                email: { equals: dto.email, mode: 'insensitive' },
                id: { not: userId },
              },
              select: { id: true },
            });
            if (emailOwner) throw new ConflictException(EMAIL_IN_USE_MESSAGE);
          }

          await this.updateUser(tx, userId, dto, dto.email);
          await tx.trainee.update({
            where: { id: traineeId },
            data: this.toTraineeRecord(dto),
          });
          await this.saveBeneficiary(tx, traineeId, dto.beneficiary);
        },
        { maxWait: 10000, timeout: 15000 },
      );
    } catch (error) {
      // Another account took the email between the check and the save.
      if (isUniqueViolation(error) && uniqueViolationMentions(error, 'email')) {
        throw new ConflictException(EMAIL_IN_USE_MESSAGE);
      }
      throw error;
    }
  }

  /** The enrollment if it may change batch or program: it must be active. */
  private async getMovableEnrollment(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
  ) {
    const enrollment = await tx.enrollments.findUnique({
      where: { id: enrollmentId },
      select: movableEnrollmentSelect,
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    if (!ACTIVE_ENROLLMENT_STATUSES.includes(enrollment.enrollment_status)) {
      throw new BadRequestException(
        'Only PENDING and ENROLLED enrollments can change batch or program.',
      );
    }

    return enrollment;
  }

  /**
   * Eligible targets for the Change Batch / Program modal: other batches of the
   * same program, and batches of other active programs. Uses the same rules as
   * the enrollment form, without the enrollment being moved.
   */
  async getChangeOptions(enrollmentId: string) {
    const enrollment = await this.getMovableEnrollment(
      this.prisma,
      enrollmentId,
    );
    const batches = await this.getAvailableBatches(
      enrollment.trainee_id,
      enrollment.id,
    );

    const currentProgramId = enrollment.batch.program_id;
    const options = batches
      .filter((batch) => batch.eligible && batch.programs.is_active)
      .map((batch) => ({
        id: batch.id,
        name: batch.batch_name,
        programId: batch.programs.id,
        programName: batch.programs.name,
        isAccredited: batch.programs.is_accredited,
        startDate: toDateOnly(batch.start_date),
        endDate: toDateOnly(batch.end_date),
        remainingSlots: batch.remainingCapacity,
        schedules: batch.programs.program_schedule.map((schedule) => ({
          name: schedule.schedule_name,
          days: schedule.days,
          startTime: toTimeOfDay(schedule.start_time),
          endTime: toTimeOfDay(schedule.end_time),
        })),
      }));

    return {
      enrollment: {
        id: enrollment.id,
        status: enrollment.enrollment_status,
        uniformSize: enrollment.uniform_size,
        batchName: enrollment.batch.batch_name,
        programName: enrollment.batch.programs.name,
      },
      sameProgramBatches: options.filter(
        (batch) => batch.programId === currentProgramId,
      ),
      otherProgramBatches: options.filter(
        (batch) => batch.programId !== currentProgramId,
      ),
    };
  }

  /**
   * Moves the enrollment to another batch of the same program. It stays the same
   * row, so the ID card, payment, uniform, documents and attendance all stay.
   */
  async changeBatch(
    enrollmentId: string,
    dto: ChangeBatchDto,
    performedByUserId: string,
  ) {
    return this.runSerializable(async (tx) => {
      const enrollment = await this.getMovableEnrollment(tx, enrollmentId);
      const target = await this.getTransferTarget(tx, dto.batchId);

      if (target.id === enrollment.batch_id) {
        throw new BadRequestException(
          'The trainee is already in the selected batch.',
        );
      }
      if (target.program_id !== enrollment.batch.program_id) {
        throw new BadRequestException(
          'The selected batch belongs to another program. Use Change Program instead.',
        );
      }

      await this.validateTransferTarget(tx, enrollment, target.id);
      await tx.enrollments.update({
        where: { id: enrollment.id },
        data: { batch_id: target.id },
      });

      return this.recordTransfer(tx, {
        type: enrollment_transfer_type_enum.BATCH_CHANGE,
        trainee_id: enrollment.trainee_id,
        from_enrollment_id: enrollment.id,
        to_enrollment_id: enrollment.id,
        from_batch_id: enrollment.batch_id,
        to_batch_id: target.id,
        reason: dto.reason,
        performed_by: performedByUserId,
      });
    });
  }

  /**
   * Shifts the trainee to another program: the old enrollment is withdrawn and a
   * new one is created with its own ID card number, the same documents and,
   * unless a new payment is recorded, the old payment carried over.
   */
  async changeProgram(
    enrollmentId: string,
    dto: ChangeProgramDto,
    performedByUserId: string,
  ) {
    return this.runSerializable(async (tx) => {
      const enrollment = await this.getMovableEnrollment(tx, enrollmentId);
      const target = await this.getTransferTarget(tx, dto.batchId);

      if (target.program_id === enrollment.batch.program_id) {
        throw new BadRequestException(
          'The selected batch is in the same program. Use Change Batch instead.',
        );
      }
      if (!target.programs.is_active) {
        throw new BadRequestException('The selected program is not active.');
      }

      await this.validateTransferTarget(tx, enrollment, target.id);

      const oldProgramName = enrollment.batch.programs.name;
      const newPayment = dto.payment?.processPayment ? dto.payment : null;
      const carriedOrNumber = newPayment
        ? null
        : await this.findCarriedOrNumber(tx, enrollment.id);

      await tx.enrollments.update({
        where: { id: enrollment.id },
        data: {
          enrollment_status: 'WITHDRAWN',
          exit_reason: `Shifted to ${target.programs.name}: ${dto.reason}`,
        },
      });

      const idCardNumber = await this.generateIdCardNumber(
        tx,
        target.program_id,
      );
      const uniformSize = dto.uniformSize ?? enrollment.uniform_size;

      const created = await tx.enrollments.create({
        data: {
          trainee_id: enrollment.trainee_id,
          batch_id: target.id,
          // A shift does not confirm a PENDING enrollment.
          enrollment_status: enrollment.enrollment_status,
          uniform_size: uniformSize,
          id_card_number: idCardNumber,
          enrolled_by: performedByUserId,
          remarks: newPayment
            ? `Shifted from ${oldProgramName}. A new payment was recorded.`
            : carriedOrNumber
              ? `Shifted from ${oldProgramName}. Payment carried over from OR ${carriedOrNumber}.`
              : `Shifted from ${oldProgramName}. No payment on record to carry over.`,
        },
        select: { id: true },
      });

      const previousChecklist = enrollment.requirement_checklist;
      await tx.requirement_checklist.create({
        data: {
          ...previousChecklist,
          enrollment_id: created.id,
          checked_by: performedByUserId,
          commitment_fee:
            Boolean(newPayment) || Boolean(previousChecklist?.commitment_fee),
        },
      });

      await this.recordUniformDistribution(
        tx,
        created.id,
        target.program_id,
        { given: dto.uniformGiven === true, size: uniformSize },
        performedByUserId,
      );

      const orNumber = newPayment
        ? await this.recordPayment(
            tx,
            created.id,
            enrollment.trainee_id,
            newPayment,
            performedByUserId,
          )
        : null;

      const transfer = await this.recordTransfer(tx, {
        type: enrollment_transfer_type_enum.PROGRAM_CHANGE,
        trainee_id: enrollment.trainee_id,
        from_enrollment_id: enrollment.id,
        to_enrollment_id: created.id,
        from_batch_id: enrollment.batch_id,
        to_batch_id: target.id,
        reason: dto.reason,
        performed_by: performedByUserId,
      });

      return { ...transfer, idCardNumber, orNumber };
    });
  }

  /** The batch a change is moving to. */
  private async getTransferTarget(
    tx: Prisma.TransactionClient,
    batchId: string,
  ) {
    const target = await tx.batch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        program_id: true,
        programs: { select: { name: true, is_active: true } },
      },
    });
    if (!target) throw new NotFoundException('Batch not found.');
    return target;
  }

  /** The enrollment rules, not counting the enrollment being moved. */
  private async validateTransferTarget(
    tx: Prisma.TransactionClient,
    enrollment: { id: string; trainee_id: string },
    batchId: string,
  ) {
    await this.validateBatchAvailability(tx, batchId);
    await this.validateTraineeProgramRules(
      tx,
      enrollment.trainee_id,
      batchId,
      enrollment.id,
    );
  }

  /**
   * The latest OR behind this enrollment. A carried-over enrollment has none of
   * its own, so earlier program changes are followed back to the original one.
   */
  private async findCarriedOrNumber(
    tx: Prisma.TransactionClient,
    enrollmentId: string,
  ): Promise<string | null> {
    let currentId: string | undefined = enrollmentId;

    while (currentId) {
      const receipt: { or_number: string } | null =
        await tx.official_receipts.findFirst({
          where: { enrollment_id: currentId },
          orderBy: { created_at: 'desc' },
          select: { or_number: true },
        });
      if (receipt) return receipt.or_number;

      const previous: { from_enrollment_id: string } | null =
        await tx.enrollment_transfers.findFirst({
          where: {
            to_enrollment_id: currentId,
            type: enrollment_transfer_type_enum.PROGRAM_CHANGE,
          },
          select: { from_enrollment_id: true },
        });
      currentId = previous?.from_enrollment_id;
    }

    return null;
  }

  /** Writes the history row, in the same transaction as the change it records. */
  private async recordTransfer(
    tx: Prisma.TransactionClient,
    data: Prisma.enrollment_transfersUncheckedCreateInput,
  ) {
    const row = await tx.enrollment_transfers.create({
      data,
      select: transferHistorySelect,
    });
    return toChangeHistoryEntry(row);
  }

  /** Every batch and program change of a trainee, newest first. Read-only. */
  async getTraineeChangeHistory(traineeId: string) {
    const trainee = await this.prisma.trainee.findUnique({
      where: { id: traineeId },
      select: { id: true },
    });
    if (!trainee) throw new NotFoundException('Trainee not found.');

    const rows = await this.prisma.enrollment_transfers.findMany({
      where: { trainee_id: traineeId },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      select: transferHistorySelect,
    });
    return rows.map(toChangeHistoryEntry);
  }
}
