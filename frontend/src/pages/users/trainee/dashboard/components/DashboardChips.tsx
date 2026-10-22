import type {
  AnnouncementScope,
  AttendanceStatus,
  BatchStatus,
  EnrollmentStatus,
  OutcomeStatus,
} from '../../../../../types/trainee-dashboard.type'

type ChipStyle = { label: string; classes: string }

const ENROLLMENT: Record<EnrollmentStatus, ChipStyle> = {
  PENDING: { label: 'Pending', classes: 'border-yellow-200 bg-yellow-50 text-yellow-800' },
  ENROLLED: { label: 'Enrolled', classes: 'border-green-200 bg-green-50 text-green-800' },
  WITHDRAWN: { label: 'Withdrawn', classes: 'border-orange-200 bg-orange-50 text-orange-800' },
  COMPLETED: { label: 'Completed', classes: 'border-blue-200 bg-blue-50 text-blue-800' },
  DROPPED: { label: 'Dropped', classes: 'border-red-200 bg-red-50 text-red-800' },
}

const BATCH: Record<BatchStatus, ChipStyle> = {
  OPEN: { label: 'Open', classes: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  ONGOING: { label: 'Ongoing', classes: 'border-blue-200 bg-blue-50 text-blue-900' },
  CLOSED: { label: 'Closed', classes: 'border-slate-200 bg-slate-50 text-slate-700' },
  CANCELLED: { label: 'Cancelled', classes: 'border-red-200 bg-red-50 text-red-800' },
}

export const ATTENDANCE: Record<AttendanceStatus, ChipStyle> = {
  PRESENT: { label: 'Present', classes: 'border-green-200 bg-green-50 text-green-800' },
  ABSENT: { label: 'Absent', classes: 'border-red-200 bg-red-50 text-red-800' },
  LATE: { label: 'Late', classes: 'border-amber-200 bg-amber-50 text-amber-800' },
  EXCUSED: { label: 'Excused', classes: 'border-sky-200 bg-sky-50 text-sky-800' },
}

const OUTCOME: Record<OutcomeStatus, ChipStyle> = {
  PENDING: { label: 'Pending', classes: 'border-amber-200 bg-amber-50 text-amber-800' },
  PASSED: { label: 'Passed', classes: 'border-green-200 bg-green-50 text-green-800' },
  FAILED: { label: 'Failed', classes: 'border-red-200 bg-red-50 text-red-800' },
  NOT_YET_ASSESSED: { label: 'Not yet assessed', classes: 'border-slate-200 bg-slate-50 text-slate-600' },
}

const SCOPE: Record<AnnouncementScope, ChipStyle> = {
  GLOBAL: { label: 'Global', classes: 'border-purple-200 bg-purple-50 text-purple-800' },
  PROGRAM: { label: 'Program', classes: 'border-green-200 bg-green-50 text-green-800' },
  BATCH: { label: 'Batch', classes: 'border-blue-200 bg-blue-50 text-blue-800' },
}

function Chip({ style, fallback }: { style: ChipStyle | undefined; fallback: string }) {
  const { label, classes } = style ?? {
    label: fallback,
    classes: 'border-slate-200 bg-slate-50 text-slate-600',
  }
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${classes}`}
    >
      {label}
    </span>
  )
}

export const EnrollmentStatusChip = ({ status }: { status: EnrollmentStatus }) => (
  <Chip style={ENROLLMENT[status]} fallback={status} />
)

export const BatchStatusChip = ({ status }: { status: BatchStatus }) => (
  <Chip style={BATCH[status]} fallback={status} />
)

export const AttendanceStatusChip = ({ status }: { status: AttendanceStatus }) => (
  <Chip style={ATTENDANCE[status]} fallback={status} />
)

export const OutcomeStatusChip = ({ status }: { status: OutcomeStatus }) => (
  <Chip style={OUTCOME[status]} fallback={status} />
)

export const ScopeChip = ({ scope }: { scope: AnnouncementScope }) => (
  <Chip style={SCOPE[scope]} fallback={scope} />
)
