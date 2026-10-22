import type { DashboardSession } from '../../../../../types/trainee-dashboard.type'
import { formatDateOnly, valueOrDash } from '../../../../../components/trainee-information/format'
import { DashboardSection, EmptyState } from './DashboardSection'

export default function UpcomingSessions({ sessions }: { sessions: DashboardSession[] }) {
  return (
    <DashboardSection eyebrow="Schedule" title="Upcoming Sessions">
      {sessions.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-calendar-days"
          title="No upcoming sessions"
          message="No training sessions are scheduled for your batch yet."
        />
      ) : (
        <ol className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <li key={session.sessionId} className="flex gap-4 py-3 first:pt-0 last:pb-0">
              <span className="w-28 shrink-0 text-sm font-semibold text-blue-900">
                {formatDateOnly(session.sessionDate)}
              </span>
              <span className="min-w-0 flex-1 text-sm text-slate-700">{valueOrDash(session.topicsCovered)}</span>
            </li>
          ))}
        </ol>
      )}
    </DashboardSection>
  )
}
