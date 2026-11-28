import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { Pagination } from '../../../../components/common/Pagination'
import { BatchStatusBadge } from '../../../../components/registrar/batches/BatchStatusBadge'
import { enumLabel, formatDateOnly, formatTime } from '../../../../components/trainee-information/format'
import { trainerClassesApi } from '../../../../api/users/trainer-classes.api'
import { CLASS_LIST_STATUSES } from '../../../../types/class-management.type'
import type { ClassListResponse, ClassListStatus } from '../../../../types/class-management.type'
import ClassPanel from './components/ClassPanel'

const DEFAULT_LIMIT = 10

function readStatus(value: string | null): ClassListStatus | '' {
  return CLASS_LIST_STATUSES.includes(value as ClassListStatus) ? (value as ClassListStatus) : ''
}

/** The trainer's batches: real start and end dates, starting and closing. */
export default function TrainerClassesPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const limit = [10, 20, 50].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : DEFAULT_LIMIT
  const status = readStatus(params.get('status'))
  const openId = params.get('batch')

  const [result, setResult] = useState<ClassListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setError(null)
    trainerClassesApi
      .list({ status, page, limit })
      .then((response) => active && setResult(response))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Unable to load your batches.'))
    return () => {
      active = false
    }
  }, [status, page, limit, reloadKey])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const loading = result === null && error === null

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainer" />
        <main className="min-w-0 flex-1">
          <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Training</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Class Management</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Confirm when your batches really start, mark them started, and close them when the training ends. The
                trainees, the registrar and the admin see the dates you set.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label htmlFor="class-status" className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </label>
              <select
                id="class-status"
                value={status}
                onChange={(e) => update({ status: e.target.value || null, page: null })}
                className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">All (not cancelled)</option>
                {CLASS_LIST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {enumLabel(s)}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p>{error}</p>
                <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="mt-2 font-semibold hover:underline">
                  Retry
                </button>
              </div>
            )}
            {loading && <p className="border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading your batches...</p>}
            {result && !error && result.data.length === 0 && (
              <div className="border border-slate-200 bg-white p-10 text-center">
                <p className="font-semibold text-slate-800">No batches here</p>
                <p className="mt-1 text-sm text-slate-500">
                  {status ? 'No batch has this status. Try another filter.' : 'Batches assigned to you will appear here.'}
                </p>
              </div>
            )}

            {result && !error && result.data.length > 0 && (
              <>
                <div className="overflow-x-auto border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th scope="col" className="px-5 py-3">Batch</th>
                        <th scope="col" className="px-5 py-3">Dates</th>
                        <th scope="col" className="px-5 py-3">Enrolled</th>
                        <th scope="col" className="px-5 py-3">Class days</th>
                        <th scope="col" className="px-5 py-3">Status</th>
                        <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.data.map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">{batch.batchName}</p>
                            <p className="text-slate-500">{batch.program.name}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <p className="text-slate-900">
                              {formatDateOnly(batch.startDate)} – {formatDateOnly(batch.endDate)}
                            </p>
                            <p className={`text-xs font-semibold ${batch.confirmed ? 'text-green-700' : 'text-slate-500'}`}>
                              {batch.confirmed ? 'Confirmed by trainer' : 'Planned'}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                            {batch.enrolled} / {batch.capacity}
                          </td>
                          <td className="px-5 py-4 text-slate-700">
                            {batch.schedules.length === 0
                              ? '—'
                              : batch.schedules.map((s) => (
                                  <span key={`${s.name}-${s.startTime}`} className="block whitespace-nowrap">
                                    {s.days.map(enumLabel).join(', ')} · {formatTime(s.startTime)}–{formatTime(s.endTime)}
                                  </span>
                                ))}
                          </td>
                          <td className="px-5 py-4">
                            <BatchStatusBadge status={batch.status} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => update({ batch: batch.id })}
                              className="font-semibold text-blue-800 hover:underline"
                              aria-label={`Manage ${batch.batchName}`}
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Pagination
                    page={result.page}
                    limit={result.limit}
                    total={result.total}
                    totalPages={result.totalPages}
                    onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
                    onLimitChange={(next) => update({ limit: next !== DEFAULT_LIMIT ? String(next) : null, page: null })}
                  />
                </div>
              </>
            )}
          </section>
        </main>
      </div>
      <Footer />

      {openId && (
        <ClassPanel
          key={openId}
          batchId={openId}
          onClose={() => update({ batch: null })}
          onChanged={(message) => {
            setToast(message)
            setReloadKey((k) => k + 1)
          }}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 z-[60] bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
