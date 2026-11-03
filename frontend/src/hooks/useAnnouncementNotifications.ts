import { useCallback, useEffect, useMemo, useState } from 'react'
import { announcementsApi, type Announcement } from '../api/announcements.api'

const POLL_MS = 60_000
const SEEN_EVENT = 'announcements:seen'

const storageKey = (userId: string) => `announcements:lastSeen:${userId}`

function readLastSeen(userId: string): number {
  const raw = localStorage.getItem(storageKey(userId))
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) ? value : 0
}

/**
 * The active announcements for the signed-in user, and how many are new since
 * they last opened the announcements page or marked everything as read.
 * "Last seen" is kept in this browser, per user.
 */
export function useAnnouncementNotifications(userId: string | undefined, enabled = true) {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSeen, setLastSeen] = useState(() => (userId ? readLastSeen(userId) : 0))

  const refresh = useCallback(() => {
    if (!enabled || !userId) return
    announcementsApi
      .active()
      .then(setItems)
      .catch(() => {
        // The bell is non-blocking: keep the last known list.
      })
      .finally(() => setLoading(false))
  }, [enabled, userId])

  // Load now, then poll, and refresh when the tab regains focus.
  useEffect(() => {
    if (!enabled || !userId) return
    refresh()
    const timer = window.setInterval(refresh, POLL_MS)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, userId, refresh])

  // Stay in sync when another component or tab marks things as read.
  useEffect(() => {
    if (!userId) return
    const sync = () => setLastSeen(readLastSeen(userId))
    window.addEventListener(SEEN_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(SEEN_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [userId])

  const unread = useMemo(
    () => items.filter((item) => new Date(item.posted_at).getTime() > lastSeen),
    [items, lastSeen],
  )

  const markAllRead = useCallback(() => {
    if (!userId) return
    // Use the newest announcement's time, so one posted a moment later still counts as new.
    const newest = items.reduce((max, item) => Math.max(max, new Date(item.posted_at).getTime()), 0)
    const next = Math.max(newest, readLastSeen(userId))
    localStorage.setItem(storageKey(userId), String(next))
    setLastSeen(next)
    window.dispatchEvent(new Event(SEEN_EVENT))
  }, [items, userId])

  return { items, loading, unread, unreadCount: unread.length, lastSeen, markAllRead, refresh }
}
