import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreateEnrollmentDto,
  TraineeInfoDto,
  RequirementChecklistDto,
} from './dto/create-enrollment.dto';
import {
  UpdateEnrollmentStatusDto,
  EnrollmentFilterDto,
} from './dto/update-enrollment.dto';
import { day_enum, enrollment_status_enum } from '../generated/prisma/enums';
import { generateOrNumber } from '../payments/or-number';

/** Initial portal password for new trainee accounts (shown once on the success screen). */
const DEFAULT_TRAINEE_PASSWORD = 'traineedefault';

const ACTIVE_ENROLLMENT_STATUSES: enrollment_status_enum[] = [
  'PENDING',
  'ENROLLED',
];

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

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
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

  async getAvailableBatches(traineeId?: string) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const traineeEnrollments = traineeId
      ? await this.prisma.enrollments.findMany({
          where: { trainee_id: traineeId },
          select: {
            batch_id: true,
            enrollment_status: true,
            batch: { select: programRuleBatchSelect },
          },
        })
      : [];
    const pastBatchIds = new Set(traineeEnrollments.map((e) => e.batch_id));
    const activeBatches = traineeEnrollments
      .filter((e) => ACTIVE_ENROLLMENT_STATUSES.includes(e.enrollment_status))
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
            control_number_prefix: true,
            program_schedule: {
              select: { days: true, start_time: true, end_time: true },
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

    if (batch.end_date < new Date()) {
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
  ) {
    const selectedBatch = await tx.batch.findUnique({
      where: { id: batchId },
      select: programRuleBatchSelect,
    });
    if (!selectedBatch) throw new NotFoundException('Batch not found.');

    const traineeEnrollments = await tx.enrollments.findMany({
      where: { trainee_id: traineeId },
      select: {
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
        .filter((e) => ACTIVE_ENROLLMENT_STATUSES.includes(e.enrollment_status))
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
  private toTraineeRecord(traineeData: TraineeInfoDto) {
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

  /** Updates the trainee's name on their account and returns their portal username. */
  private async updateUser(
    tx: Parameters<Parameters<typeof this.prisma.$transaction>[0]>[0],
    userId: string,
    traineeData: TraineeInfoDto,
  ): Promise<string> {
    const user = await tx.users.update({
      where: { id: userId },
      data: {
        first_name: traineeData.firstName,
        middle_name: traineeData.middleName || '',
        last_name: traineeData.lastName,
      },
      select: { system_id: true },
    });
    return user.system_id ?? '';
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

    const dateOfBirth = traineeData.dateOfBirth;
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

            // Deduct uniform stock and record its history in this same
            // transaction, now that the enrollment ID is available.
            let inventoryId: string | null = null;
            if (uniformGiven) {
              inventoryId = await this.inventoryService.deductAndLog(
                tx,
                batch.program_id,
                uniformSize,
                enrollment.id,
                enrolledByUserId,
              );
            }

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

            await tx.distribution_checklist.create({
              data: {
                enrollment_id: enrollment.id,
                inventory_id: inventoryId,
                uniform_given: uniformGiven,
                size_issued: uniformGiven ? uniformSize : null,
                date_distributed: uniformGiven ? new Date() : null,
                distributed_by: uniformGiven ? enrolledByUserId : null,
              },
            });

            let orNumber: string | null = null;
            if (payment.processPayment) {
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
              orNumber = await generateOrNumber(tx, paymentDate);
              const receipt = await tx.official_receipts.create({
                data: {
                  enrollment_id: enrollment.id,
                  or_number: orNumber,
                  base_fee: baseFee,
                  amount: payment.amount!,
                  payment_date: paymentDate,
                  payment_method: payment.paymentMethod!,
                  reason_of_dues: payment.reasonOfDues || 'ENROLLMENT',
                  remarks: payment.remarks,
                  confirmed_by: enrolledByUserId,
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
   * Saves the registrar's edit of an enrollment's submitted documents.
   * Creates the checklist if the enrollment has none yet (older records).
   */
  async updateRequirementChecklist(
    enrollmentId: string,
    checklist: RequirementChecklistDto,
    checkedByUserId: string,
  ) {
    const enrollment = await this.prisma.enrollments.findUnique({
      where: { id: enrollmentId },
      select: { id: true },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found.');
    }

    const data = {
      bc_nso_psa_copy: checklist.bcNsoPsaCopy,
      diploma_tor: checklist.diplomaTor,
      brgy_clearance: checklist.brgyClearance,
      one_by_one_pic: checklist.oneByOnePic,
      two_by_two_pic: checklist.twoByTwoPic,
      passport_size: checklist.passportSize,
      // Omitted remarks keep the existing value
      remarks: checklist.remarks,
      checked_by: checkedByUserId,
      checked_at: new Date(),
    };

    return this.prisma.requirement_checklist.upsert({
      where: { enrollment_id: enrollmentId },
      update: data,
      create: { enrollment_id: enrollmentId, ...data },
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
    });
  }
}
