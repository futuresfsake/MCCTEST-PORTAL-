import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  attendance_status_enum,
  batch_status_enum,
  enrollment_status_enum,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SaveAttendanceDto } from './dto/save-attendance.dto';
import { isHoursCompleted } from './attendance.constants';

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

type TrainerBatch = Prisma.batchGetPayload<{
  include: { programs: { include: { program_schedule: true } } };
}>;

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listBatches(trainerId: string) {
    const batches = await this.prisma.batch.findMany({
      where: { trainer_id: trainerId, batch_status: batch_status_enum.ONGOING },
      include: {
        programs: {
          include: { program_schedule: { orderBy: { schedule_name: 'asc' } } },
        },
      },
      orderBy: { start_date: 'asc' },
    });
    return batches.map((batch) => this.batchSummary(batch));
  }

  async getSession(trainerId: string, batchId: string, date: string) {
    const batch = await this.findBatch(trainerId, batchId);
    const sessionDate = this.parseDate(date);
    this.assertDateRange(batch, sessionDate);
    const session = await this.prisma.training_session.findUnique({
      where: {
        batch_id_session_date: { batch_id: batchId, session_date: sessionDate },
      },
      include: {
        attendance: {
          include: {
            enrollments: {
              include: {
                trainee: {
                  include: {
                    users: {
                      select: {
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { enrollments: { trainee_id: 'asc' } },
        },
      },
    });
    const enrollments = await this.roster(
      batchId,
      session?.session_id,
      sessionDate,
    );
    const byEnrollment = new Map(
      (session?.attendance ?? []).map((row) => [row.enrollment_id, row]),
    );
    const entries = enrollments.map((enrollment) => {
      const row = byEnrollment.get(enrollment.id);
      return {
        enrollmentId: enrollment.id,
        traineeName: this.traineeName(enrollment.trainee.users),
        status: row?.status ?? null,
        remark: row?.remarks ?? '',
        readOnly:
          enrollment.enrollment_status !== enrollment_status_enum.ENROLLED,
      };
    });
    return {
      batch: this.batchSummary(batch),
      date,
      scheduled: this.isScheduled(batch, sessionDate),
      suggestedHours: this.defaultHours(batch, sessionDate),
      session: session
        ? {
            id: session.session_id,
            hours: Number(session.hours),
            updatedAt: session.updated_at.toISOString(),
          }
        : null,
      entries,
      counts: this.counts(entries),
    };
  }

  async listSessions(trainerId: string, batchId: string) {
    const batch = await this.findBatch(trainerId, batchId);
    const sessions = await this.prisma.training_session.findMany({
      where: { batch_id: batch.id },
      include: { attendance: { select: { status: true } } },
      orderBy: { session_date: 'desc' },
    });
    return sessions.map((session) => ({
      id: session.session_id,
      date: this.dateString(session.session_date),
      hours: Number(session.hours),
      updatedAt: session.updated_at.toISOString(),
      scheduled: this.isScheduled(batch, session.session_date),
      counts: this.counts(session.attendance),
    }));
  }

  async summary(trainerId: string, batchId: string) {
    const batch = await this.findBatch(trainerId, batchId);
    const enrollments = await this.prisma.enrollments.findMany({
      where: { batch_id: batch.id },
      include: {
        trainee: {
          include: {
            users: {
              select: { first_name: true, middle_name: true, last_name: true },
            },
          },
        },
        attendance: {
          include: { training_session: { select: { hours: true } } },
        },
      },
      orderBy: { trainee_id: 'asc' },
    });
    const totalHours = batch.programs.total_training_hours
      ? Number(batch.programs.total_training_hours)
      : null;
    return {
      batch: this.batchSummary(batch),
      totalProgramHours: totalHours,
      trainees: enrollments.map((enrollment) => {
        const counts = this.counts(enrollment.attendance);
        const hoursCompleted = enrollment.attendance.reduce(
          (sum, row) =>
            sum +
            (isHoursCompleted(row.status)
              ? Number(row.training_session.hours)
              : 0),
          0,
        );
        return {
          enrollmentId: enrollment.id,
          traineeName: this.traineeName(enrollment.trainee.users),
          hoursCompleted,
          percentage: totalHours
            ? Math.min(100, (hoursCompleted / totalHours) * 100)
            : null,
          counts,
        };
      }),
    };
  }

  async save(trainerId: string, batchId: string, dto: SaveAttendanceDto) {
    const batch = await this.findBatch(trainerId, batchId);
    const sessionDate = this.parseDate(dto.sessionDate);
    this.assertDateRange(batch, sessionDate);
    if ((dto.hours * 4) % 1 !== 0) {
      throw new BadRequestException('Hours must be in 0.25-hour steps');
    }
    if (sessionDate < this.today()) {
      if (!dto.reason?.trim()) {
        throw new BadRequestException(
          'A reason is required when saving a past session',
        );
      }
    }

    const existingSession = await this.prisma.training_session.findUnique({
      where: {
        batch_id_session_date: { batch_id: batchId, session_date: sessionDate },
      },
      select: { session_id: true },
    });
    const roster = await this.roster(
      batchId,
      existingSession?.session_id,
      sessionDate,
    );
    const expectedIds = new Set(roster.map((item) => item.id));
    const editableIds = new Set(
      roster
        .filter(
          (item) => item.enrollment_status === enrollment_status_enum.ENROLLED,
        )
        .map((item) => item.id),
    );
    const providedIds = new Set(dto.entries.map((entry) => entry.enrollmentId));
    if (
      providedIds.size !== dto.entries.length ||
      expectedIds.size !== providedIds.size ||
      [...expectedIds].some((id) => !providedIds.has(id))
    ) {
      throw new BadRequestException(
        'Every enrolled trainee must have one attendance status',
      );
    }
    if (dto.entries.some((entry) => !expectedIds.has(entry.enrollmentId))) {
      throw new BadRequestException(
        'Attendance can only be recorded for enrolled trainees',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.training_session.findUnique({
          where: {
            batch_id_session_date: {
              batch_id: batchId,
              session_date: sessionDate,
            },
          },
          include: { attendance: true },
        });
        if (
          existing &&
          dto.expectedUpdatedAt &&
          existing.updated_at.getTime() !==
            new Date(dto.expectedUpdatedAt).getTime()
        ) {
          throw new ConflictException(
            'This session changed elsewhere. Reload before saving.',
          );
        }
        if (existing && !dto.expectedUpdatedAt) {
          throw new ConflictException(
            'This session already exists. Reload before saving.',
          );
        }
        const hoursChanged =
          existing !== null && Number(existing.hours) !== dto.hours;
        const topicsChanged =
          existing !== null &&
          (existing.topics_covered ?? '') !== (dto.topics?.trim() ?? '');
        const session = existing
          ? hoursChanged || topicsChanged
            ? await tx.training_session.update({
                where: { session_id: existing.session_id },
                data: {
                  hours: dto.hours,
                  topics_covered: dto.topics?.trim() || null,
                  updated_at: new Date(),
                  updated_by: trainerId,
                },
              })
            : existing
          : await tx.training_session.create({
              data: {
                batch_id: batchId,
                session_date: sessionDate,
                hours: dto.hours,
                topics_covered: dto.topics?.trim() || null,
                created_by: trainerId,
                updated_by: trainerId,
              },
            });
        const oldByEnrollment = new Map(
          (existing?.attendance ?? []).map((row) => [row.enrollment_id, row]),
        );
        for (const entry of dto.entries) {
          const old = oldByEnrollment.get(entry.enrollmentId);
          const data = {
            status: entry.status,
            remarks: entry.remark?.trim() || null,
            updated_at: new Date(),
            updated_by: trainerId,
          };
          if (!editableIds.has(entry.enrollmentId)) {
            if (
              !old ||
              old.status !== entry.status ||
              old.remarks !== data.remarks
            ) {
              throw new BadRequestException(
                'Withdrawn trainee attendance is read-only',
              );
            }
            continue;
          }
          if (old) {
            if (old.status !== entry.status || old.remarks !== data.remarks) {
              await tx.attendance.update({ where: { id: old.id }, data });
              await tx.attendance_history.create({
                data: {
                  session_id: session.session_id,
                  attendance_id: old.id,
                  enrollment_id: entry.enrollmentId,
                  event_type: 'ATTENDANCE_CHANGED',
                  old_status: old.status,
                  new_status: entry.status,
                  old_remarks: old.remarks,
                  new_remarks: data.remarks,
                  changed_by: trainerId,
                  reason: dto.reason,
                },
              });
            }
          } else {
            const created = await tx.attendance.create({
              data: {
                session_id: session.session_id,
                enrollment_id: entry.enrollmentId,
                recorded_by: trainerId,
                ...data,
              },
            });
            await tx.attendance_history.create({
              data: {
                session_id: session.session_id,
                attendance_id: created.id,
                enrollment_id: entry.enrollmentId,
                event_type: 'ATTENDANCE_RECORDED',
                new_status: entry.status,
                new_remarks: data.remarks,
                changed_by: trainerId,
                reason: dto.reason,
              },
            });
          }
        }
        if (existing && hoursChanged) {
          await tx.attendance_history.create({
            data: {
              session_id: session.session_id,
              event_type: 'HOURS_CHANGED',
              old_hours: existing.hours,
              new_hours: dto.hours,
              changed_by: trainerId,
              reason: dto.reason,
            },
          });
        }
        return {
          sessionId: session.session_id,
          updatedAt: session.updated_at.toISOString(),
        };
      });
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Another save won this session. Reload before saving.',
        );
      }
      throw error;
    }
  }

  async exportCsv(
    trainerId: string,
    batchId: string,
    from?: string,
    to?: string,
  ) {
    const batch = await this.findBatch(trainerId, batchId, true);
    const fromDate = from ? this.parseDate(from) : null;
    const toDate = to ? this.parseDate(to) : null;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        'Export from date must be on or before export to date',
      );
    }
    const sessions = await this.prisma.training_session.findMany({
      where: {
        batch_id: batch.id,
        ...(from || to
          ? {
              session_date: {
                ...(from ? { gte: this.parseDate(from) } : {}),
                ...(to ? { lte: this.parseDate(to) } : {}),
              },
            }
          : {}),
      },
      include: { attendance: true },
      orderBy: { session_date: 'asc' },
    });
    if (sessions.length === 0) {
      throw new ConflictException('The batch has no saved sessions to export');
    }
    const enrollments = await this.prisma.enrollments.findMany({
      where: { batch_id: batch.id },
      include: {
        trainee: {
          include: {
            users: {
              select: {
                system_id: true,
                first_name: true,
                middle_name: true,
                last_name: true,
              },
            },
          },
        },
      },
      orderBy: { trainee_id: 'asc' },
    });
    const dates = sessions.map((session) =>
      this.dateString(session.session_date),
    );
    const header = [
      'Trainee',
      'System ID',
      ...dates,
      'Present',
      'Absent',
      'Late',
      'Excused',
      'Hours completed',
      'Program hours %',
    ];
    const rows = enrollments.map((enrollment) => {
      const bySession = new Map(
        sessions.map((session) => [
          session.session_id,
          session.attendance.find((row) => row.enrollment_id === enrollment.id),
        ]),
      );
      const statuses = sessions.map(
        (session) => bySession.get(session.session_id)?.status ?? '',
      );
      const counts = this.counts(
        statuses.map((status) => ({
          status: status === '' ? null : status,
        })),
      );
      const hours = sessions.reduce((sum, session) => {
        const row = bySession.get(session.session_id);
        return (
          sum +
          (row && isHoursCompleted(row.status) ? Number(session.hours) : 0)
        );
      }, 0);
      const percentage = batch.programs.total_training_hours
        ? (hours / Number(batch.programs.total_training_hours)) * 100
        : '';
      return [
        this.traineeName(enrollment.trainee.users),
        enrollment.trainee.users?.system_id ?? '',
        ...statuses.map((status) => this.statusLetter(status)),
        counts.PRESENT,
        counts.ABSENT,
        counts.LATE,
        counts.EXCUSED,
        hours,
        percentage === '' ? '' : percentage.toFixed(2),
      ];
    });
    return [header, ...rows]
      .map((row) => row.map((value) => this.csvCell(value)).join(','))
      .join('\r\n');
  }

  async deleteSession(trainerId: string, batchId: string, date: string) {
    const batch = await this.findBatch(trainerId, batchId);
    const sessionDate = this.parseDate(date);
    this.assertDateRange(batch, sessionDate);
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.training_session.findUnique({
        where: {
          batch_id_session_date: {
            batch_id: batchId,
            session_date: sessionDate,
          },
        },
        include: { attendance: true },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }
      if (session.attendance.length > 0) {
        throw new ConflictException(
          'A session with attendance rows cannot be deleted',
        );
      }
      await tx.attendance_history.create({
        data: {
          session_id: session.session_id,
          event_type: 'SESSION_DELETED',
          changed_by: trainerId,
        },
      });
      await tx.training_session.delete({
        where: { session_id: session.session_id },
      });
      return { deleted: true };
    });
  }

  async history(trainerId: string, batchId: string, date: string) {
    const batch = await this.findBatch(trainerId, batchId);
    const sessionDate = this.parseDate(date);
    this.assertDateRange(batch, sessionDate);
    const session = await this.prisma.training_session.findUnique({
      where: {
        batch_id_session_date: {
          batch_id: batchId,
          session_date: sessionDate,
        },
      },
      select: { session_id: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return this.prisma.attendance_history.findMany({
      where: { session_id: session.session_id },
      include: {
        users: {
          select: { first_name: true, middle_name: true, last_name: true },
        },
      },
      orderBy: { changed_at: 'desc' },
    });
  }

  private async findBatch(
    trainerId: string,
    batchId: string,
    allowClosed = false,
  ): Promise<TrainerBatch> {
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: batchId,
        trainer_id: trainerId,
        ...(allowClosed
          ? {
              batch_status: {
                in: [batch_status_enum.ONGOING, batch_status_enum.CLOSED],
              },
            }
          : { batch_status: batch_status_enum.ONGOING }),
      },
      include: {
        programs: {
          include: { program_schedule: { orderBy: { schedule_name: 'asc' } } },
        },
      },
    });
    if (!batch)
      throw new NotFoundException(
        'Batch not found or unavailable for attendance',
      );
    return batch;
  }

  private async roster(
    batchId: string,
    sessionId?: string,
    sessionDate?: Date,
  ) {
    return this.prisma.enrollments.findMany({
      where: {
        batch_id: batchId,
        OR: [
          {
            enrollment_status: enrollment_status_enum.ENROLLED,
            ...(sessionDate ? { enrolled_at: { lte: sessionDate } } : {}),
          },
          ...(sessionId
            ? [{ attendance: { some: { session_id: sessionId } } }]
            : []),
        ],
      },
      include: {
        trainee: {
          include: {
            users: {
              select: { first_name: true, middle_name: true, last_name: true },
            },
          },
        },
      },
      orderBy: { trainee_id: 'asc' },
    });
  }

  private assertDateRange(batch: TrainerBatch, date: Date) {
    if (date < batch.start_date || date > this.today())
      throw new BadRequestException(
        'Session date must be from the batch start date through today',
      );
  }

  private parseDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('Invalid session date');
    }
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw new BadRequestException('Invalid session date');
    }
    return date;
  }

  private today() {
    const now = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return this.parseDate(now);
  }

  private dateString(value: Date) {
    return value.toISOString().slice(0, 10);
  }

  private isScheduled(batch: TrainerBatch, date: Date) {
    const day = DAY_NAMES[date.getUTCDay()];
    return batch.programs.program_schedule.some((schedule) =>
      schedule.days.includes(day),
    );
  }

  private defaultHours(batch: TrainerBatch, date: Date) {
    const day = DAY_NAMES[date.getUTCDay()];
    return batch.programs.program_schedule
      .filter((schedule) => schedule.days.includes(day))
      .reduce(
        (hours, schedule) =>
          hours +
          (schedule.end_time.getTime() - schedule.start_time.getTime()) /
            3600000,
        0,
      );
  }

  private batchSummary(batch: TrainerBatch) {
    return {
      id: batch.id,
      name: batch.batch_name,
      programName: batch.programs.name,
      programHours: batch.programs.total_training_hours
        ? Number(batch.programs.total_training_hours)
        : null,
      startDate: this.dateString(batch.start_date),
      endDate: this.dateString(batch.end_date),
      status: batch.batch_status,
      schedules: batch.programs.program_schedule.map((schedule) => ({
        name: schedule.schedule_name,
        days: schedule.days,
        startTime: schedule.start_time.toISOString().slice(11, 16),
        endTime: schedule.end_time.toISOString().slice(11, 16),
      })),
    };
  }

  private traineeName(
    user: {
      first_name: string;
      middle_name: string | null;
      last_name: string;
    } | null,
  ) {
    if (!user) return 'Unknown trainee';
    return [user.first_name, user.middle_name, user.last_name]
      .filter(Boolean)
      .join(' ');
  }

  private counts(rows: Array<{ status: attendance_status_enum | null }>) {
    return rows.reduce(
      (counts, row) => {
        if (row.status) counts[row.status] += 1;
        return counts;
      },
      { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
    );
  }

  private csvCell(value: unknown) {
    const text =
      value === null || value === undefined
        ? ''
        : typeof value === 'string' || typeof value === 'number'
          ? value.toString()
          : JSON.stringify(value);
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }

  private statusLetter(status: attendance_status_enum | '') {
    if (status === 'PRESENT') return 'P';
    if (status === 'ABSENT') return 'A';
    if (status === 'LATE') return 'L';
    if (status === 'EXCUSED') return 'E';
    return '';
  }
}
