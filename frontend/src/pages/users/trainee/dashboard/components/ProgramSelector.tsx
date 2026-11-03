import type { DashboardEnrollmentDetail } from '../../../../../types/trainee-dashboard.type'
import { formatDateOnly } from '../../../../../components/trainee-information/format'
import { EnrollmentStatusChip } from './DashboardChips'

type ProgramSelectorProps = {
  enrollments: DashboardEnrollmentDetail[]
  selectedId: string
  onSelect: (enrollmentId: string) => void
}

export default function ProgramSelector({ enrollments, selectedId, onSelect }: ProgramSelectorProps) {
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">My Programs</p>
      <h2 className="mt-1 text-lg font-bold text-slate-900">Select a program to view</h2>

      <div role="radiogroup" aria-label="Enrolled programs" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {enrollments.map((enrollment) => {
          const isSelected = enrollment.enrollmentId === selectedId
          const percentage = enrollment.attendance.attendancePercentage
          return (
            <button
              key={enrollment.enrollmentId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(enrollment.enrollmentId)}
              className={[
                'border bg-white p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-800',
                isSelected ? 'border-blue-900 ring-1 ring-blue-900' : 'border-slate-200 hover:border-slate-300',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{enrollment.program.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {enrollment.program.programCode} · {enrollment.batch.batchName}
                  </p>
                </div>
                <EnrollmentStatusChip status={enrollment.enrollmentStatus} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>
                  {formatDateOnly(enrollment.batch.startDate)} – {formatDateOnly(enrollment.batch.endDate)}
                </span>
                <span className="font-semibold text-slate-700">
                  {percentage === null ? '—' : `${percentage}%`} attendance
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
