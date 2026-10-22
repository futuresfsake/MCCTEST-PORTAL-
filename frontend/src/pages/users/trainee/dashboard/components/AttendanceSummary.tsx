import type { AttendanceStatus, DashboardAttendance } from '../../../../../types/trainee-dashboard.type'
import { formatDateOnly, valueOrDash } from '../../../../../components/trainee-information/format'
import { ATTENDANCE, AttendanceStatusChip } from './DashboardChips'
import { DashboardSection, EmptyState } from './DashboardSection'

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']

export default function AttendanceSummary({ attendance }: { attendance: DashboardAttendance }) {
  const percentage = attendance.attendancePercentage

  return (
    <DashboardSection
      eyebrow="Attendance"
      title="Attendance Summary"
      aside={
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{percentage === null ? '—' : `${percentage}%`}</p>
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
            Present of {attendance.totalSessions} session{attendance.totalSessions === 1 ? '' : 's'}
          </p>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATUSES.map((status) => (
          <div key={status} className={`border px-4 py-3 ${ATTENDANCE[status].classes}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{ATTENDANCE[status].label}</p>
            <p className="mt-1 text-2xl font-bold">{attendance.counts[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Recent records</h3>
      {attendance.recent.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            icon="fa-solid fa-calendar-check"
            title="No attendance records yet"
            message="Your attendance will show up here after your trainer records your first session."
          />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-[11px] uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="py-2 pr-4 font-semibold">Date</th>
                <th className="py-2 pr-4 font-semibold">Topics covered</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendance.recent.map((record) => (
                <tr key={record.id}>
                  <td className="whitespace-nowrap py-3 pr-4 text-slate-700">{formatDateOnly(record.sessionDate)}</td>
                  <td className="py-3 pr-4 text-slate-700">{valueOrDash(record.topicsCovered)}</td>
                  <td className="py-3 pr-4">
                    <AttendanceStatusChip status={record.status} />
                  </td>
                  <td className="py-3 text-slate-500">{valueOrDash(record.remarks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  )
}
