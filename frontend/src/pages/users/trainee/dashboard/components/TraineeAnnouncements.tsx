import { useState } from 'react'
import type { DashboardAnnouncement } from '../../../../../types/trainee-dashboard.type'
import AnnouncementAuthor from '../../../../../components/Announcements/AnnouncementAuthor'
import { formatTimestamp } from '../../../../../components/trainee-information/format'
import { ScopeChip } from './DashboardChips'
import { DashboardSection, EmptyState } from './DashboardSection'

function targetLabel(item: DashboardAnnouncement): string {
  if (item.scope === 'PROGRAM') return item.program?.name ?? 'Your program'
  if (item.scope === 'BATCH') return item.batch?.batchName ?? 'Your batch'
  return 'All users'
}

export default function TraineeAnnouncements({ announcements }: { announcements: DashboardAnnouncement[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <DashboardSection eyebrow="Communications" title="Announcements">
      {announcements.length === 0 ? (
        <EmptyState
          icon="fa-solid fa-bullhorn"
          title="No announcements"
          message="Announcements for everyone, your program, or your batch will appear here."
        />
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => {
            const isExpanded = expanded === item.id
            return (
              <article key={item.id} className="border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ScopeChip scope={item.scope} />
                    <span className="text-xs text-slate-500">{targetLabel(item)}</span>
                  </div>
                  <span className="text-xs text-slate-400">{formatTimestamp(item.postedAt)}</span>
                </div>
                <p className={`mt-3 whitespace-pre-wrap text-sm text-slate-800 ${isExpanded ? '' : 'line-clamp-3'}`}>
                  {item.content}
                </p>
                {item.content.length > 180 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : item.id)}
                    className="mt-2 text-xs font-semibold text-blue-800"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                )}
                {item.remarks && <p className="mt-2 text-xs text-slate-500">{item.remarks}</p>}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <AnnouncementAuthor role={item.postedBy.role} firstName={item.postedBy.name} />
                </div>
              </article>
            )
          })}
        </div>
      )}
    </DashboardSection>
  )
}
