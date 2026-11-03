import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import AnnouncementCard from '../../../../components/Announcements/AnnouncementCard'
import { useAuth } from '../../../../context/AuthContext'
import { useAnnouncementNotifications } from '../../../../hooks/useAnnouncementNotifications'

/** Read-only list of the announcements meant for this trainee. */
export default function TraineeAnnouncementsPage() {
  const { user } = useAuth()
  const { items, loading, lastSeen, markAllRead } = useAnnouncementNotifications(user?.id)

  // Keep the "New" markers for this visit, then mark everything as read.
  const [seenAtOpen, setSeenAtOpen] = useState<number | null>(null)
  useEffect(() => {
    if (loading) return
    setSeenAtOpen((current) => current ?? lastSeen)
    markAllRead()
  }, [loading, lastSeen, markAllRead])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainee" />
        <main className="min-w-0 flex-1 border-b border-slate-200 bg-slate-50">
          <section>
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="mb-8">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Communications
                </p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Announcements</h1>
                <p className="mt-2 text-slate-600">
                  Notices for everyone, your program, and your batch.
                </p>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((key) => (
                    <div key={key} className="h-24 animate-pulse border border-slate-200 bg-white" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="border border-slate-200 bg-white p-10 text-center">
                  <Megaphone size={28} strokeWidth={1.5} className="mx-auto text-slate-300" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">No announcements</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Announcements for everyone, your program, or your batch will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <AnnouncementCard
                      key={item.id}
                      announcement={item}
                      isNew={new Date(item.posted_at).getTime() > (seenAtOpen ?? 0)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  )
}
