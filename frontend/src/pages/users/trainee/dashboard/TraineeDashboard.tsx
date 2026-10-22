import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { useAuth } from '../../../../context/AuthContext'
import { traineeApi } from '../../../../api/users/trainee.api'
import type { DashboardAttendance, TraineeDashboardPayload } from '../../../../types/trainee-dashboard.type'
import ProgramSelector from './components/ProgramSelector'
import EnrollmentCard from './components/EnrollmentCard'
import AttendanceSummary from './components/AttendanceSummary'
import CompetencyOutcomes from './components/CompetencyOutcomes'
import UpcomingSessions from './components/UpcomingSessions'
import TraineeAnnouncements from './components/TraineeAnnouncements'

const NO_ATTENDANCE: DashboardAttendance = {
  counts: { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 },
  totalSessions: 0,
  attendancePercentage: null,
  recent: [],
}

// Read-only landing page for trainees: nothing on this page writes data.
export default function TraineeDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<TraineeDashboardPayload | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () =>
      data?.enrollments.find((e) => e.enrollmentId === selectedId) ??
      data?.enrollments[0] ??
      null,
    [data, selectedId],
  )

  // GLOBAL, plus PROGRAM/BATCH announcements for the selected enrollment only.
  const announcements = useMemo(
    () =>
      (data?.announcements ?? []).filter(
        (item) =>
          item.scope === 'GLOBAL' ||
          (item.scope === 'PROGRAM' && item.program?.id === selected?.program.id) ||
          (item.scope === 'BATCH' && item.batch?.id === selected?.batch.id),
      ),
    [data, selected],
  )

  const load = useCallback(() => {
    let active = true
    setLoading(true)
    setError(null)
    traineeApi
      .dashboard()
      .then((payload) => {
        if (!active) return
        setData(payload)
        setSelectedId((current) =>
          payload.enrollments.some((e) => e.enrollmentId === current) ? current : payload.defaultEnrollmentId,
        )
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load your dashboard.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => load(), [load])

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainee" />

        <main className="min-w-0 flex-1">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
                <div>
                  <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Trainee</p>
                  <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-950 md:text-5xl">
                    MCCTEST
                    <span className="block text-blue-900">Trainee Dashboard</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                    View your enrollment, attendance, competency progress, and announcements.
                  </p>
                </div>

                <div className="border-l border-slate-200 pl-6 lg:ml-auto lg:max-w-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Trainee Portal</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{user?.systemId || '—'}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-500">Welcome to your MCCTEST Trainee Portal.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
              {loading ? (
                <div className="space-y-6" aria-busy="true">
                  {[1, 2, 3].map((key) => (
                    <div key={key} className="h-40 animate-pulse border border-slate-200 bg-white" />
                  ))}
                </div>
              ) : error || !data ? (
                <div className="border border-red-200 bg-red-50 px-6 py-8 text-center">
                  <p className="text-sm font-semibold text-red-800">We couldn't load your dashboard.</p>
                  <p className="mt-1 text-xs text-red-700">{error ?? 'Please try again.'}</p>
                  <button
                    type="button"
                    onClick={load}
                    className="mt-4 border border-red-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-red-800 hover:bg-red-100"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {data.enrollments.length > 1 && selected && (
                    <ProgramSelector
                      enrollments={data.enrollments}
                      selectedId={selected.enrollmentId}
                      onSelect={setSelectedId}
                    />
                  )}
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                    <div className="space-y-6">
                      <EnrollmentCard enrollment={selected} />
                      <AttendanceSummary attendance={selected?.attendance ?? NO_ATTENDANCE} />
                      <CompetencyOutcomes groups={selected?.competencies ?? []} />
                    </div>
                    <div className="space-y-6">
                      <UpcomingSessions sessions={selected?.upcomingSessions ?? []} />
                      <TraineeAnnouncements announcements={announcements} />
                    </div>
                  </div>
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
