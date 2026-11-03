import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { announcementsApi, type Announcement } from '../../api/announcements.api'
import AnnouncementCard from './AnnouncementCard'

type AnnouncementWidgetProps = {
  /** When set, shows a "View all" link to the full announcements page. */
  viewAllHref?: string
}

export default function AnnouncementWidget({ viewAllHref }: AnnouncementWidgetProps) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

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
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
            Communications
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Announcements</h2>
        </div>
        {viewAllHref && (
          <Link to={viewAllHref} className="text-xs font-semibold text-blue-800 hover:underline">
            View all
          </Link>
        )}
      </div>
      {loading
        ? [1, 2].map((key) => (
            <div key={key} className="h-24 animate-pulse border border-slate-200 bg-white" />
          ))
        : items.map((item) => <AnnouncementCard key={item.id} announcement={item} />)}
    </section>
  )
}
