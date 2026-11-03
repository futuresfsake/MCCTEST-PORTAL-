import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useAnnouncementNotifications } from '../../hooks/useAnnouncementNotifications'

/** Where each role reads announcements. Only the trainee has a read-only page for now. */
const ANNOUNCEMENTS_PATH: Record<string, string> = {
  TRAINEE: '/trainee/announcements',
}

/** Header bell with a badge for announcements the user hasn't seen yet. */
export default function AnnouncementBell() {
  const { user } = useAuth()
  const path = user ? ANNOUNCEMENTS_PATH[user.role] : undefined
  const { items, unread, unreadCount, markAllRead } = useAnnouncementNotifications(
    user?.id,
    Boolean(path),
  )
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!path) return null

  const latest = items.slice(0, 5)
  const unreadIds = new Set(unread.map((item) => item.id))
  const badge = unreadCount > 9 ? '9+' : String(unreadCount)

  return (
    <div ref={containerRef} className="relative">
      {/* Same size and outline as the Sign Out button beside it. */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={unreadCount > 0 ? `Announcements, ${unreadCount} new` : 'Announcements'}
        aria-expanded={open}
        aria-haspopup="true"
        className={`relative flex h-[42px] w-[42px] items-center justify-center border border-blue-900 transition ${
          open ? 'bg-blue-900 text-white' : 'text-blue-900 hover:bg-blue-900 hover:text-white'
        }`}
      >
        <Bell size={18} strokeWidth={2} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] border border-slate-200 bg-white shadow-md">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
              Announcements
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-semibold text-blue-800 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {latest.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No announcements yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {latest.map((item) => {
                const isNew = unreadIds.has(item.id)
                return (
                  <li key={item.id} className="border-b border-slate-100 last:border-b-0">
                    <Link
                      to={path}
                      onClick={() => setOpen(false)}
                      className={`block border-l-2 px-4 py-3 transition hover:bg-slate-50 ${
                        isNew ? 'border-blue-900 bg-slate-50' : 'border-transparent'
                      }`}
                    >
                      <p
                        className={`line-clamp-2 text-sm ${
                          isNew ? 'font-medium text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {item.content}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(item.posted_at).toLocaleDateString()}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}

          <Link
            to={path}
            onClick={() => setOpen(false)}
            className="block border-t border-slate-200 px-4 py-3 text-center text-sm font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white"
          >
            View all announcements
          </Link>
        </div>
      )}
    </div>
  )
}
