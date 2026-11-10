import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  batch_status_enum,
  enrollment_status_enum,
  gender_enum,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import {
  TraineeListQueryDto,
  TraineeSortField,
} from './dto/trainee-list-query.dto';
import type {
  TraineeFilterOptions,
  TraineeListResponse,
  TraineeListRow,
  TraineeProfile,
} from './trainee-information.types';

/** Required documents counted as "complete" (same list the enrollment form uses). */
const REQUIRED_DOCUMENTS = [
  'bc_nso_psa_copy',
  'diploma_tor',
  'brgy_clearance',
  'one_by_one_pic',
  'two_by_two_pic',
  'passport_size',
] as const;

/** Most search words honoured; extra words are ignored. */
const MAX_SEARCH_TERMS = 5;

/**
 * Whitelisted ORDER BY clauses. They use the page query's output column
 * names so the same clause orders the inner (limited) and outer queries.
 * Every clause ends on the id so pages never overlap or skip rows.
 */
const SORT_CLAUSES: Record<TraineeSortField, Record<'asc' | 'desc', string>> = {
  name: {
    asc: 'last_name ASC NULLS LAST, first_name ASC NULLS LAST, id ASC',
    desc: 'last_name DESC NULLS LAST, first_name DESC NULLS LAST, id DESC',
  },
  enrolledAt: {
    asc: 'enrolled_at ASC NULLS LAST, id ASC',
    desc: 'enrolled_at DESC NULLS LAST, id DESC',
  },
  idCard: {
    asc: 'id_card_number ASC NULLS LAST, id ASC',
    desc: 'id_card_number DESC NULLS LAST, id DESC',
  },
};

/** One row of the raw page query (column names as returned by Postgres). */
interface TraineePageRow {
  id: string;
  contact_number: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  system_id: string | null;
  email: string | null;
  enrollment_id: string | null;
  enrollment_status: enrollment_status_enum | null;
  id_card_number: string | null;
  enrolled_at: Date | null;
  batch_name: string | null;
  program_name: string | null;
  enrollment_count: number;
}

function whereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

/** Escapes LIKE wildcards so user input is matched literally. */
function containsPattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, '\\$&')}%`;
}

/**
 * Start of a calendar day (YYYY-MM-DD) in the server's local time zone,
 * the same convention the enrollment module uses for calendar days.
 */
function startOfLocalDay(day: string, addDays = 0): Date {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date + addDays);
}

/** Today's local calendar day as YYYY-MM-DD (matches stored insurance dates). */
function localToday(): string {
  const now = new Date();
  return toDateOnly(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
}

/** @db.Date values arrive as UTC midnight; keep just the calendar day. */
export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** @db.Time values arrive on 1970-01-01 UTC; keep HH:mm. */
export function toTimeOfDay(value: Date): string {
  return value.toISOString().slice(11, 16);
}

/** Limits what a caller can see. Omitted for admin and registrar (no limit). */
export interface TraineeScope {
  /** users.id of a trainer; only trainees enrolled in their batches are visible. */
  trainerUserId?: string;
}

/**
 * Read-only trainee records shared by the Admin, Registrar and Trainer modules.
 * Controllers stay thin: they only add the role guard and route prefix.
 */
@Injectable()
export class TraineeInformationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One row per trainee. Filtering, sorting and paging all run in the
   * database: the page and the total are two queries sent in parallel.
   */
  async listTrainees(
    query: TraineeListQueryDto,
    scope: TraineeScope = {},
  ): Promise<TraineeListResponse> {
    const { page, limit } = query;

    // Conditions on a single enrollment. A trainee is listed when at least
    // one of their enrollments meets all of them, and that enrollment is the
    // one shown in the row.
    const enrollmentConditions: Prisma.Sql[] = [];
    if (scope.trainerUserId) {
      enrollmentConditions.push(
        Prisma.sql`b.trainer_id IN (SELECT tr.id FROM trainer tr WHERE tr.user_id = ${scope.trainerUserId}::uuid)`,
      );
    }
    if (query.programId) {
      enrollmentConditions.push(
        Prisma.sql`b.program_id = ${query.programId}::uuid`,
      );
    }
    if (query.batchId) {
      enrollmentConditions.push(
        Prisma.sql`e.batch_id = ${query.batchId}::uuid`,
      );
    }
    if (query.enrollmentStatus) {
      enrollmentConditions.push(
        Prisma.sql`e.enrollment_status = ${query.enrollmentStatus}::enrollment_status_enum`,
      );
    }
    if (query.batchStatus) {
      enrollmentConditions.push(
        Prisma.sql`b.batch_status = ${query.batchStatus}::batch_status_enum`,
      );
    }
    if (query.dateFrom) {
      enrollmentConditions.push(
        Prisma.sql`e.enrolled_at >= ${startOfLocalDay(query.dateFrom).toISOString()}::timestamptz`,
      );
    }
    if (query.dateTo) {
      enrollmentConditions.push(
        Prisma.sql`e.enrolled_at < ${startOfLocalDay(query.dateTo, 1).toISOString()}::timestamptz`,
      );
    }
    if (query.programType) {
      enrollmentConditions.push(
        query.programType === 'ACCREDITED'
          ? Prisma.sql`p.is_accredited`
          : Prisma.sql`NOT p.is_accredited`,
      );
    }
    if (query.requirements) {
      const allSubmitted = Prisma.raw(
        `COALESCE(${REQUIRED_DOCUMENTS.map((column) => `rc.${column}`).join(' AND ')}, FALSE)`,
      );
      enrollmentConditions.push(
        query.requirements === 'COMPLETE'
          ? allSubmitted
          : Prisma.sql`NOT ${allSubmitted}`,
      );
    }

    // Conditions on the trainee themself.
    const traineeConditions: Prisma.Sql[] = [];
    if (query.gender) {
      traineeConditions.push(
        Prisma.sql`t.gender = ${query.gender}::gender_enum`,
      );
    }
    if (query.insurance) {
      const today = localToday();
      const activeCoverage = Prisma.sql`EXISTS (
        SELECT 1 FROM insurance_coverage ic
        WHERE ic.trainee_id = t.id
          AND ic.effective_date <= ${today}::date
          AND ic.expiry_date >= ${today}::date
      )`;
      traineeConditions.push(
        query.insurance === 'ACTIVE'
          ? activeCoverage
          : Prisma.sql`NOT ${activeCoverage}`,
      );
    }
    // Every word must match some field, so names match in any order
    // ("dela cruz juan" finds Juan Dela Cruz).
    const terms = (query.search ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, MAX_SEARCH_TERMS);
    for (const term of terms) {
      const pattern = containsPattern(term);
      traineeConditions.push(Prisma.sql`(
        u.first_name ILIKE ${pattern}
        OR u.last_name ILIKE ${pattern}
        OR u.middle_name ILIKE ${pattern}
        OR u.system_id ILIKE ${pattern}
        OR u.email ILIKE ${pattern}
        OR t.contact_number ILIKE ${pattern}
        OR t.id IN (
          SELECT se.trainee_id FROM enrollments se
          WHERE se.id_card_number ILIKE ${pattern}
        )
        OR t.id IN (
          SELECT re.trainee_id FROM official_receipts r
          JOIN enrollments re ON re.id = r.enrollment_id
          WHERE r.or_number ILIKE ${pattern}
        )
      )`);
    }

    const requiresDocuments = Boolean(query.requirements);
    // Latest matching enrollment per trainee.
    const matchedEnrollments = Prisma.sql`
      WITH matched AS (
        SELECT DISTINCT ON (e.trainee_id)
          e.trainee_id,
          e.id AS enrollment_id,
          e.enrollment_status::text AS enrollment_status,
          e.id_card_number,
          e.enrolled_at,
          b.batch_name,
          p.name AS program_name
        FROM enrollments e
        JOIN batch b ON b.id = e.batch_id
        JOIN programs p ON p.id = b.program_id
        ${requiresDocuments ? Prisma.sql`LEFT JOIN requirement_checklist rc ON rc.enrollment_id = e.id` : Prisma.empty}
        ${whereClause(enrollmentConditions)}
        ORDER BY e.trainee_id, e.enrolled_at DESC, e.id DESC
      )`;
    // Without enrollment filters, trainees with no enrollment are listed too.
    const traineeSource = Prisma.sql`
      FROM trainee t
      LEFT JOIN users u ON u.id = t.users_id
      ${enrollmentConditions.length ? Prisma.sql`JOIN` : Prisma.sql`LEFT JOIN`} matched m ON m.trainee_id = t.id
      ${whereClause(traineeConditions)}`;
    const orderBy = Prisma.raw(SORT_CLAUSES[query.sortBy][query.sortOrder]);

    const [rows, [{ total }]] = await Promise.all([
      // The enrollment count runs only for the rows on this page.
      this.prisma.$queryRaw<TraineePageRow[]>(Prisma.sql`
        ${matchedEnrollments}
        SELECT page.*,
          (SELECT COUNT(*)::int FROM enrollments ec
            ${scope.trainerUserId ? Prisma.sql`JOIN batch cb ON cb.id = ec.batch_id` : Prisma.empty}
            WHERE ec.trainee_id = page.id
            ${scope.trainerUserId ? Prisma.sql`AND cb.trainer_id IN (SELECT tr.id FROM trainer tr WHERE tr.user_id = ${scope.trainerUserId}::uuid)` : Prisma.empty}
          ) AS enrollment_count
        FROM (
          SELECT
            t.id,
            t.contact_number,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.system_id,
            u.email,
            m.enrollment_id,
            m.enrollment_status,
            m.id_card_number,
            m.enrolled_at,
            m.batch_name,
            m.program_name
          ${traineeSource}
          ORDER BY ${orderBy}
          LIMIT ${limit} OFFSET ${(page - 1) * limit}
        ) page
        ORDER BY ${orderBy}`),
      this.prisma.$queryRaw<{ total: number }[]>(Prisma.sql`
        ${matchedEnrollments}
        SELECT COUNT(*)::int AS total
        ${traineeSource}`),
    ]);

    return {
      data: rows.map((row) => this.toListRow(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Dropdown values for the list filters (two small queries in parallel). */
  async getFilterOptions(
    scope: TraineeScope = {},
  ): Promise<TraineeFilterOptions> {
    const ownBatch: Prisma.batchWhereInput = scope.trainerUserId
      ? { trainer: { user_id: scope.trainerUserId } }
      : {};
    const [programs, batches] = await Promise.all([
      this.prisma.programs.findMany({
        where: scope.trainerUserId ? { batch: { some: ownBatch } } : {},
        select: { id: true, name: true, is_accredited: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.batch.findMany({
        where: ownBatch,
        select: {
          id: true,
          batch_name: true,
          program_id: true,
          batch_status: true,
        },
        orderBy: [{ start_date: 'desc' }, { batch_name: 'asc' }],
      }),
    ]);

    return {
      programs: programs.map((program) => ({
        id: program.id,
        name: program.name,
        isAccredited: program.is_accredited,
      })),
      batches: batches.map((batch) => ({
        id: batch.id,
        name: batch.batch_name,
        programId: batch.program_id,
        status: batch.batch_status,
      })),
      enrollmentStatuses: Object.values(enrollment_status_enum),
      batchStatuses: Object.values(batch_status_enum),
      genders: Object.values(gender_enum),
    };
  }

  /** Full read-only profile, loaded in one Prisma query. */
  async getTraineeProfile(
    id: string,
    scope: TraineeScope = {},
  ): Promise<TraineeProfile> {
    const ownBatch: Prisma.enrollmentsWhereInput = scope.trainerUserId
      ? { batch: { trainer: { user_id: scope.trainerUserId } } }
      : {};
    const trainee = await this.prisma.trainee.findFirst({
      // A trainer only reaches trainees enrolled in their own batches.
      where: scope.trainerUserId
        ? { id, enrollments: { some: ownBatch } }
        : { id },
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
        // Account fields shown to staff only; never password_hash or auth state
        users: {
          select: {
            first_name: true,
            middle_name: true,
            last_name: true,
            system_id: true,
            email: true,
          },
        },
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
          orderBy: { expiry_date: 'desc' },
          select: {
            coverage_id: true,
            effective_date: true,
            expiry_date: true,
            official_receipts: { select: { or_number: true } },
          },
        },
        enrollments: {
          where: ownBatch,
          orderBy: { enrolled_at: 'desc' },
          select: {
            id: true,
            enrollment_status: true,
            id_card_number: true,
            uniform_size: true,
            enrolled_at: true,
            official_receipts: {
              orderBy: { created_at: 'desc' },
              take: 1,
              select: { or_number: true },
            },
            requirement_checklist: {
              select: {
                bc_nso_psa_copy: true,
                diploma_tor: true,
                brgy_clearance: true,
                one_by_one_pic: true,
                two_by_two_pic: true,
                passport_size: true,
                remarks: true,
              },
            },
            batch: {
              select: {
                id: true,
                batch_name: true,
                batch_status: true,
                start_date: true,
                end_date: true,
                trainer: {
                  select: {
                    users: { select: { first_name: true, last_name: true } },
                  },
                },
                programs: {
                  select: {
                    id: true,
                    name: true,
                    is_accredited: true,
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
              },
            },
          },
        },
      },
    });

    if (!trainee) {
      throw new NotFoundException('Trainee not found.');
    }

    const today = localToday();
    const beneficiary = trainee.trainee_beneficiaries;

    return {
      id: trainee.id,
      firstName: trainee.users?.first_name ?? '',
      middleName: trainee.users?.middle_name ?? '',
      lastName: trainee.users?.last_name ?? '',
      username: trainee.users?.system_id ?? null,
      email: trainee.users?.email ?? null,
      contactNumber: trainee.contact_number,
      gender: trainee.gender,
      dateOfBirth: toDateOnly(trainee.date_of_birth),
      placeOfBirth: trainee.place_of_birth,
      citizenship: trainee.citizenship,
      civilStatus: trainee.civil_status,
      pwd: trainee.pwd,
      address: {
        street: trainee.street_address,
        barangay: trainee.barangay,
        municipality: trainee.municipality,
        district: trainee.district,
        province: trainee.province,
      },
      family: {
        motherName: trainee.mother_name,
        fatherName: trainee.father_name,
      },
      education: { highestEducation: trainee.highest_education },
      employment: {
        status: trainee.employment_status,
        type: trainee.employment_type,
      },
      beneficiary: beneficiary && {
        firstName: beneficiary.first_name,
        middleName: beneficiary.middle_name,
        lastName: beneficiary.last_name,
        relationship: beneficiary.relationship,
        contactNumber: beneficiary.contact_number,
        address: beneficiary.address,
        idNumber: beneficiary.id_number,
      },
      // Trainers don't see insurance data.
      insurance: (scope.trainerUserId ? [] : trainee.insurance_coverage).map(
        (coverage) => {
          const effectiveDate = toDateOnly(coverage.effective_date);
          const expiryDate = toDateOnly(coverage.expiry_date);
          return {
            id: coverage.coverage_id,
            effectiveDate,
            expiryDate,
            orNumber: coverage.official_receipts.or_number,
            isActive: effectiveDate <= today && expiryDate >= today,
          };
        },
      ),
      enrollments: trainee.enrollments.map((enrollment) => {
        const { batch } = enrollment;
        const checklist = enrollment.requirement_checklist;
        const trainer = batch.trainer.users;
        return {
          id: enrollment.id,
          status: enrollment.enrollment_status,
          idCardNumber: enrollment.id_card_number,
          uniformSize: enrollment.uniform_size,
          enrolledAt: enrollment.enrolled_at,
          orNumber: enrollment.official_receipts[0]?.or_number ?? null,
          requirementsSubmitted: checklist
            ? REQUIRED_DOCUMENTS.filter((column) => checklist[column]).length
            : 0,
          requirementsTotal: REQUIRED_DOCUMENTS.length,
          requirementsRemarks: checklist?.remarks?.trim() || null,
          batch: {
            id: batch.id,
            name: batch.batch_name,
            status: batch.batch_status,
            startDate: toDateOnly(batch.start_date),
            endDate: toDateOnly(batch.end_date),
            trainerName:
              `${trainer.first_name} ${trainer.last_name}`.trim() || null,
          },
          program: {
            id: batch.programs.id,
            name: batch.programs.name,
            isAccredited: batch.programs.is_accredited,
            schedules: batch.programs.program_schedule.map((schedule) => ({
              name: schedule.schedule_name,
              days: schedule.days,
              startTime: toTimeOfDay(schedule.start_time),
              endTime: toTimeOfDay(schedule.end_time),
            })),
          },
        };
      }),
    };
  }

  private toListRow(row: TraineePageRow): TraineeListRow {
    const { enrollment_id, enrollment_status, enrolled_at } = row;
    const enrollment =
      enrollment_id && enrollment_status && enrolled_at
        ? {
            id: enrollment_id,
            programName: row.program_name ?? '',
            batchName: row.batch_name ?? '',
            status: enrollment_status,
            idCardNumber: row.id_card_number,
            enrolledAt: enrolled_at,
          }
        : null;

    return {
      id: row.id,
      firstName: row.first_name ?? '',
      middleName: row.middle_name ?? '',
      lastName: row.last_name ?? '',
      username: row.system_id,
      email: row.email,
      contactNumber: row.contact_number,
      enrollment,
      otherEnrollmentCount: Math.max(
        row.enrollment_count - (enrollment ? 1 : 0),
        0,
      ),
    };
  }
}
