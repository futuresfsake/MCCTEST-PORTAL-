/** Mirrors the GET /api/trainee/dashboard payload. Dates are YYYY-MM-DD, times HH:MM. */

export type EnrollmentStatus = 'PENDING' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED' | 'DROPPED'
export type BatchStatus = 'OPEN' | 'ONGOING' | 'CLOSED' | 'CANCELLED'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'
export type OutcomeStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'NOT_YET_ASSESSED'
export type CompetencyCategory = 'BASIC' | 'COMMON' | 'CORE'
export type AnnouncementScope = 'GLOBAL' | 'PROGRAM' | 'BATCH'
export type Day = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface DashboardSchedule {
  scheduleName: string
  days: Day[]
  startTime: string
  endTime: string
}

export interface DashboardEnrollment {
  enrollmentId: string
  enrollmentStatus: EnrollmentStatus
  enrolledAt: string
  idCardNumber: string | null
  program: {
    id: string
    name: string
    programCode: string
    schedules: DashboardSchedule[]
  }
  batch: {
    id: string
    batchName: string
    batchStatus: BatchStatus
    startDate: string
    endDate: string
  }
  trainer: { name: string } | null
}

export interface DashboardAttendanceRecord {
  id: string
  sessionDate: string
  topicsCovered: string | null
  status: AttendanceStatus
  remarks: string | null
}

export interface DashboardAttendance {
  counts: Record<AttendanceStatus, number>
  totalSessions: number
  attendancePercentage: number | null
  recent: DashboardAttendanceRecord[]
}

export interface DashboardOutcome {
  learningOutcomeId: string
  outcomeNumber: number
  outcomeDescription: string
  status: OutcomeStatus
  dateChecked: string | null
}

export interface DashboardCompetency {
  competencyId: string
  competencyCode: string
  competencyTitle: string
  outcomes: DashboardOutcome[]
}

export interface DashboardCompetencyGroup {
  category: CompetencyCategory
  competencies: DashboardCompetency[]
}

export interface DashboardSession {
  sessionId: string
  sessionDate: string
  topicsCovered: string | null
}

export interface DashboardAnnouncement {
  id: string
  scope: AnnouncementScope
  content: string
  remarks: string | null
  postedAt: string
  postedBy: { name: string; role: string }
  program: { id: string; name: string } | null
  batch: { id: string; batchName: string } | null
}

export interface DashboardEnrollmentDetail extends DashboardEnrollment {
  attendance: DashboardAttendance
  competencies: DashboardCompetencyGroup[]
  upcomingSessions: DashboardSession[]
}

export interface TraineeDashboardPayload {
  defaultEnrollmentId: string | null
  enrollments: DashboardEnrollmentDetail[]
  announcements: DashboardAnnouncement[]
}
