import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  announcement_scope_enum,
  attendance_status_enum,
  competency_category_enum,
  enrollment_status_enum,
  outcome_status_enum,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type {
  DashboardAnnouncement,
  DashboardAttendance,
  DashboardCompetencyGroup,
  DashboardEnrollment,
  DashboardEnrollmentDetail,
  DashboardSession,
  TraineeDashboardPayload,
} from './dashboard.types';

/** Statuses that tie the trainee to a batch's live schedule and announcements. */
const ACTIVE_STATUSES: enrollment_status_enum[] = [
  enrollment_status_enum.ENROLLED,
  enrollment_status_enum.PENDING,
];

const CATEGORY_ORDER: competency_category_enum[] = [
  competency_category_enum.BASIC,
  competency_category_enum.COMMON,
  competency_category_enum.CORE,
];

const RECENT_ATTENDANCE_LIMIT = 10;
const UPCOMING_SESSION_LIMIT = 5;

const enrollmentInclude = {
  batch: {
    include: {
      programs: {
        include: {
          program_schedule: { orderBy: { schedule_name: 'asc' } },
        },
      },
      trainer: {
        include: {
          users: {
            select: { first_name: true, middle_name: true, last_name: true },
          },
        },
      },
    },
  },
} satisfies Prisma.enrollmentsInclude;

type EnrollmentWithBatch = Prisma.enrollmentsGetPayload<{
  include: typeof enrollmentInclude;
}>;

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** TIME columns come back as 1970-01-01T<time>Z. */
function toTimeOnly(value: Date): string {
  return value.toISOString().slice(11, 16);
}

function fullName(person: {
  first_name: string;
  middle_name: string | null;
  last_name: string;
}): string {
  return [person.first_name, person.middle_name, person.last_name]
    .filter((part) => part?.trim())
    .join(' ');
}

/** Today's calendar date in server time, as a UTC-midnight Date for DATE columns. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds the dashboard for the logged-in trainee. The trainee is always
   * resolved from the JWT user id — never from client input.
   */
  async getDashboard(userId: string): Promise<TraineeDashboardPayload> {
    try {
      const enrollments = await this.findEnrollments(userId);
      const active = enrollments.filter((e) =>
        ACTIVE_STATUSES.includes(e.enrollment_status),
      );

      const [details, announcements] = await Promise.all([
        Promise.all(enrollments.map((e) => this.buildEnrollmentDetail(e))),
        this.getAnnouncements(
          active.map((e) => e.batch.program_id),
          active.map((e) => e.batch_id),
        ),
      ]);

      return {
        // Active enrollments come first, so the first one is the default card.
        defaultEnrollmentId: enrollments[0]?.id ?? null,
        enrollments: details,
        announcements,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to load trainee dashboard for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Unable to load your dashboard right now. Please try again later.',
      );
    }
  }

  /**
   * Every enrollment of the trainee: ENROLLED/PENDING first, then the rest
   * (completed, withdrawn, dropped), each group newest first. Empty when the
   * trainee has never been enrolled.
   */
  private async findEnrollments(
    userId: string,
  ): Promise<EnrollmentWithBatch[]> {
    const trainee = await this.prisma.trainee.findUnique({
      where: { users_id: userId },
      select: { id: true },
    });
    if (!trainee) return [];

    const enrollments = await this.prisma.enrollments.findMany({
      where: { trainee_id: trainee.id },
      include: enrollmentInclude,
      orderBy: { enrolled_at: 'desc' },
    });

    const isActive = (e: EnrollmentWithBatch) =>
      ACTIVE_STATUSES.includes(e.enrollment_status);
    return [
      ...enrollments.filter(isActive),
      ...enrollments.filter((e) => !isActive(e)),
    ];
  }

  private async buildEnrollmentDetail(
    enrollment: EnrollmentWithBatch,
  ): Promise<DashboardEnrollmentDetail> {
    const isActive = ACTIVE_STATUSES.includes(enrollment.enrollment_status);
    const [attendance, competencies, upcomingSessions] = await Promise.all([
      this.getAttendance(enrollment.id),
      this.getCompetencies(enrollment),
      isActive ? this.getUpcomingSessions(enrollment.batch_id) : [],
    ]);

    return {
      ...this.mapEnrollment(enrollment),
      attendance,
      competencies,
      upcomingSessions,
    };
  }

  private mapEnrollment(enrollment: EnrollmentWithBatch): DashboardEnrollment {
    const { batch } = enrollment;
    const trainerUser = batch.trainer?.users;

    return {
      enrollmentId: enrollment.id,
      enrollmentStatus: enrollment.enrollment_status,
      enrolledAt: enrollment.enrolled_at.toISOString(),
      idCardNumber: enrollment.id_card_number,
      program: {
        id: batch.programs.id,
        name: batch.programs.name,
        programCode: batch.programs.program_code,
        schedules: batch.programs.program_schedule.map((schedule) => ({
          scheduleName: schedule.schedule_name,
          days: schedule.days,
          startTime: toTimeOnly(schedule.start_time),
          endTime: toTimeOnly(schedule.end_time),
        })),
      },
      batch: {
        id: batch.id,
        batchName: batch.batch_name,
        batchStatus: batch.batch_status,
        startDate: toDateOnly(batch.start_date),
        endDate: toDateOnly(batch.end_date),
      },
      trainer: trainerUser ? { name: fullName(trainerUser) } : null,
    };
  }

  private async getAttendance(
    enrollmentId: string,
  ): Promise<DashboardAttendance> {
    const counts = Object.fromEntries(
      Object.values(attendance_status_enum).map((status) => [status, 0]),
    ) as Record<attendance_status_enum, number>;

    const [grouped, recent] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { enrollment_id: enrollmentId },
        _count: { _all: true },
      }),
      this.prisma.attendance.findMany({
        where: { enrollment_id: enrollmentId },
        include: {
          training_session: {
            select: { session_date: true, topics_covered: true },
          },
        },
        orderBy: { training_session: { session_date: 'desc' } },
        take: RECENT_ATTENDANCE_LIMIT,
      }),
    ]);

    for (const row of grouped) counts[row.status] = row._count._all;
    const totalSessions = grouped.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );

    return {
      counts,
      totalSessions,
      attendancePercentage:
        totalSessions > 0
          ? Math.round((counts.PRESENT / totalSessions) * 10000) / 100
          : null,
      recent: recent.map((record) => ({
        id: record.id,
        sessionDate: toDateOnly(record.training_session.session_date),
        topicsCovered: record.training_session.topics_covered,
        status: record.status,
        remarks: record.remarks,
      })),
    };
  }

  /**
   * Every learning outcome of the enrolled program, with this enrollment's
   * status. Outcomes without a status row are NOT_YET_ASSESSED.
   */
  private async getCompetencies(
    enrollment: EnrollmentWithBatch,
  ): Promise<DashboardCompetencyGroup[]> {
    const competencies = await this.prisma.competency.findMany({
      where: { program_id: enrollment.batch.program_id },
      include: {
        competency_category: { select: { category_name: true } },
        learning_outcome: {
          include: {
            trainee_outcome_status: {
              where: { enrollment_id: enrollment.id },
              select: { status: true, date_checked: true },
              take: 1,
            },
          },
          orderBy: [{ sort_order: 'asc' }, { outcome_number: 'asc' }],
        },
      },
      orderBy: [{ sort_order: 'asc' }, { competency_code: 'asc' }],
    });

    return CATEGORY_ORDER.map((category) => ({
      category,
      competencies: competencies
        .filter((c) => c.competency_category.category_name === category)
        .map((c) => ({
          competencyId: c.competency_id,
          competencyCode: c.competency_code,
          competencyTitle: c.competency_title,
          outcomes: c.learning_outcome.map((outcome) => {
            const status = outcome.trainee_outcome_status[0];
            return {
              learningOutcomeId: outcome.learning_outcome_id,
              outcomeNumber: outcome.outcome_number,
              outcomeDescription: outcome.outcome_description,
              status: status?.status ?? outcome_status_enum.NOT_YET_ASSESSED,
              dateChecked: status?.date_checked
                ? toDateOnly(status.date_checked)
                : null,
            };
          }),
        })),
    })).filter((group) => group.competencies.length > 0);
  }

  private async getUpcomingSessions(
    batchId: string,
  ): Promise<DashboardSession[]> {
    const sessions = await this.prisma.training_session.findMany({
      where: { batch_id: batchId, session_date: { gte: startOfToday() } },
      select: { session_id: true, session_date: true, topics_covered: true },
      orderBy: { session_date: 'asc' },
      take: UPCOMING_SESSION_LIMIT,
    });

    return sessions.map((session) => ({
      sessionId: session.session_id,
      sessionDate: toDateOnly(session.session_date),
      topicsCovered: session.topics_covered,
    }));
  }

  /**
   * GLOBAL, plus PROGRAM/BATCH announcements matching any of the trainee's
   * active programs and batches — fetched in a single query, newest first.
   * The client narrows them to the selected enrollment.
   */
  private async getAnnouncements(
    programIds: string[],
    batchIds: string[],
  ): Promise<DashboardAnnouncement[]> {
    const scopes: Prisma.announcementsWhereInput[] = [
      { scope: announcement_scope_enum.GLOBAL },
    ];
    if (programIds.length > 0) {
      scopes.push({
        scope: announcement_scope_enum.PROGRAM,
        program_id: { in: programIds },
      });
    }
    if (batchIds.length > 0) {
      scopes.push({
        scope: announcement_scope_enum.BATCH,
        batch_id: { in: batchIds },
      });
    }

    const announcements = await this.prisma.announcements.findMany({
      where: { OR: scopes },
      include: {
        users: {
          select: {
            first_name: true,
            middle_name: true,
            last_name: true,
            role: true,
          },
        },
        programs: { select: { id: true, name: true } },
        batch: { select: { id: true, batch_name: true } },
      },
      orderBy: { posted_at: 'desc' },
    });

    return announcements.map((item) => ({
      id: item.id,
      scope: item.scope,
      content: item.content,
      remarks: item.remarks,
      postedAt: item.posted_at.toISOString(),
      postedBy: { name: fullName(item.users), role: item.users.role },
      program: item.programs
        ? { id: item.programs.id, name: item.programs.name }
        : null,
      batch: item.batch
        ? { id: item.batch.id, batchName: item.batch.batch_name }
        : null,
    }));
  }
}
