import { useEffect, useState } from 'react'
import { announcementsApi, type Announcement } from '../../api/announcements.api'
import AnnouncementAuthor from './AnnouncementAuthor'
import AnnouncementTarget from './AnnouncementTarget'

export default function AnnouncementWidget() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    announcementsApi
      .active()
      .then((data) => {
        if (mounted) setItems(data.slice(0, 3))
      })
      .catch(() => {
        // Dashboard announcements are non-blocking.
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  if (!loading && items.length === 0) return null

  return (
    <section className="mb-8 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
          Communications
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">Announcements</h2>
      </div>
      {loading
        ? [1, 2].map((key) => (
            <div key={key} className="h-24 animate-pulse border border-slate-200 bg-white" />
          ))
        : items.map((item) => {
            const isExpanded = expanded === item.id
            return (
              <article key={item.id} className="flex gap-4 border border-slate-200 bg-white p-5">
                <AnnouncementAuthor
                  layout="stacked"
                  role={item.users?.role}
                  firstName={item.users?.first_name}
                  lastName={item.users?.last_name}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <AnnouncementTarget announcement={item} />
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(item.posted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={`mt-3 whitespace-pre-wrap text-sm text-slate-800 ${isExpanded ? '' : 'line-clamp-3'}`}>
                    {item.content}
                  </p>
                  {item.content.length > 180 && (
                    <button type="button" onClick={() => setExpanded(isExpanded ? null : item.id)} className="mt-2 text-xs font-semibold text-blue-800">
                      {isExpanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                  {item.remarks && <p className="mt-3 text-xs text-slate-500">{item.remarks}</p>}
                </div>
              </article>
            )
          })}
    </section>
  )
}
