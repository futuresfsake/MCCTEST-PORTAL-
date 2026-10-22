import type {
  announcement_scope_enum,
  attendance_status_enum,
  batch_status_enum,
  competency_category_enum,
  day_enum,
  enrollment_status_enum,
  outcome_status_enum,
  user_role_enum,
} from '../../../generated/prisma/client';

/** Calendar dates are serialized as YYYY-MM-DD; times as HH:MM. */
export interface DashboardSchedule {
  scheduleName: string;
  days: day_enum[];
  startTime: string;
  endTime: string;
}

export interface DashboardEnrollment {
  enrollmentId: string;
  enrollmentStatus: enrollment_status_enum;
  enrolledAt: string;
  idCardNumber: string | null;
  program: {
    id: string;
    name: string;
    programCode: string;
    schedules: DashboardSchedule[];
  };
  batch: {
    id: string;
    batchName: string;
    batchStatus: batch_status_enum;
    startDate: string;
    endDate: string;
  };
  trainer: { name: string } | null;
}

export interface DashboardAttendanceRecord {
  id: string;
  sessionDate: string;
  topicsCovered: string | null;
  status: attendance_status_enum;
  remarks: string | null;
}

export interface DashboardAttendance {
  counts: Record<attendance_status_enum, number>;
  totalSessions: number;
  attendancePercentage: number | null;
  recent: DashboardAttendanceRecord[];
}

export interface DashboardOutcome {
  learningOutcomeId: string;
  outcomeNumber: number;
  outcomeDescription: string;
  status: outcome_status_enum;
  dateChecked: string | null;
}

export interface DashboardCompetency {
  competencyId: string;
  competencyCode: string;
  competencyTitle: string;
  outcomes: DashboardOutcome[];
}

export interface DashboardCompetencyGroup {
  category: competency_category_enum;
  competencies: DashboardCompetency[];
}

export interface DashboardSession {
  sessionId: string;
  sessionDate: string;
  topicsCovered: string | null;
}

export interface DashboardAnnouncement {
  id: string;
  scope: announcement_scope_enum;
  content: string;
  remarks: string | null;
  postedAt: string;
  postedBy: { name: string; role: user_role_enum };
  program: { id: string; name: string } | null;
  batch: { id: string; batchName: string } | null;
}

export interface DashboardEnrollmentDetail extends DashboardEnrollment {
  attendance: DashboardAttendance;
  competencies: DashboardCompetencyGroup[];
  upcomingSessions: DashboardSession[];
}

export interface TraineeDashboardPayload {
  /** First active enrollment, else the latest one; null when never enrolled. */
  defaultEnrollmentId: string | null;
  enrollments: DashboardEnrollmentDetail[];
  announcements: DashboardAnnouncement[];
}
