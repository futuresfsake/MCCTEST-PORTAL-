import { useState } from 'react'
import type { Announcement } from '../../api/announcements.api'
import AnnouncementAuthor from './AnnouncementAuthor'
import AnnouncementTarget from './AnnouncementTarget'

type AnnouncementCardProps = {
  announcement: Announcement
  /** Shows a small "New" marker for announcements the user hasn't seen yet. */
  isNew?: boolean
}

/** One announcement, shared by the dashboard widget and the announcements page. */
export default function AnnouncementCard({ announcement, isNew = false }: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <article className="flex gap-4 border border-slate-200 bg-white p-5">
      <AnnouncementAuthor
        layout="stacked"
        role={announcement.users?.role}
        firstName={announcement.users?.first_name}
        lastName={announcement.users?.last_name}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <AnnouncementTarget announcement={announcement} />
            {isNew && (
              <span className="bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                New
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400">
            {new Date(announcement.posted_at).toLocaleDateString()}
          </span>
        </div>
        <p className={`mt-3 whitespace-pre-wrap text-sm text-slate-800 ${expanded ? '' : 'line-clamp-3'}`}>
          {announcement.content}
        </p>
        {announcement.content.length > 180 && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="mt-2 text-xs font-semibold text-blue-800"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
        {announcement.remarks && <p className="mt-3 text-xs text-slate-500">{announcement.remarks}</p>}
      </div>
    </article>
  )
}
