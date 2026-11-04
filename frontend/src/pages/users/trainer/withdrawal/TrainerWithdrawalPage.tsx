import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { Pagination } from '../../../../components/common/Pagination'
import { trainerWithdrawalApi } from '../../../../api/users/trainer-withdrawal.api'
import type {
  TrainerStatusFilter,
  TrainerWithdrawalListResponse,
  WithdrawalStatus,
} from '../../../../types/withdrawal.type'
import WithdrawalStatusBadge from '../../../../components/withdrawal/WithdrawalStatusBadge'
import { formatDate, STATUS_LABELS } from '../../../../components/withdrawal/withdrawal-pipeline'
import TrainerWithdrawalPanel from './components/TrainerWithdrawalPanel'

const DEFAULT_LIMIT = 10
const STATUSES = Object.keys(STATUS_LABELS) as WithdrawalStatus[]

function readStatus(value: string | null): TrainerStatusFilter {
  if (value === 'ALL') return 'ALL'
  return STATUSES.includes(value as WithdrawalStatus) ? (value as WithdrawalStatus) : ''
}

/**
 * The trainer's side of the withdrawal pipeline: requests from trainees in
 * their own batches. Opening one shows a side panel to approve or reject it.
 */
export default function TrainerWithdrawalPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const limit = [10, 20, 50].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : DEFAULT_LIMIT
  const status = readStatus(params.get('status'))
  const search = params.get('search') ?? ''
  const openId = params.get('request')

  const [result, setResult] = useState<TrainerWithdrawalListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [searchInput, setSearchInput] = useState(search)
  const searchTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let active = true
    trainerWithdrawalApi
      .list({ page, limit, status, search })
      .then((response) => {
        if (!active) return
        setResult(response)
        setError(null)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load withdrawal requests.')
      })
    return () => {
      active = false
    }
  }, [page, limit, status, search, reloadKey])

  useEffect(() => () => window.clearTimeout(searchTimer.current), [])

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

  function handleSearch(value: string) {
    setSearchInput(value)
    window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => update({ search: value.trim() || null, page: null }), 300)
  }

  const closePanel = useCallback(() => update({ request: null }), [update])
  const loading = result === null && error === null
  const waitingForMe = status === ''

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainer" />
        <main className="min-w-0 flex-1">
          <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Training</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900">Withdrawal requests</h1>
              <p className="mt-2 max-w-2xl text-slate-600">
                Requests from trainees in your batches. You review them first. Approved requests go on to the
                registrar.
              </p>
            </div>

            <div className="mb-4 flex flex-wrap items-end gap-4">
              <div>
                <label htmlFor="trainer-wd-status" className="block text-sm font-medium text-slate-700">
                  Show
                </label>
                <select
                  id="trainer-wd-status"
                  value={status}
                  onChange={(e) => update({ status: e.target.value || null, page: null })}
                  className="mt-1 border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                >
                  <option value="">Waiting for me</option>
                  <option value="ALL">All requests</option>
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[14rem] flex-1 sm:max-w-sm">
                <label htmlFor="trainer-wd-search" className="block text-sm font-medium text-slate-700">
                  Search trainee
                </label>
                <input
                  id="trainer-wd-search"
                  type="search"
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Name or system ID"
                  maxLength={100}
                  className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}{' '}
                <button type="button" className="font-semibold underline" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </button>
              </div>
            )}

            {loading && <p className="text-sm text-slate-500">Loading requests…</p>}

            {result && result.data.length === 0 && (
              <div className="border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="font-semibold text-slate-900">
                  {search
                    ? 'No requests match your search.'
                    : waitingForMe
                      ? 'Nothing is waiting for you.'
                      : 'No requests with this status.'}
                </p>
                {waitingForMe && !search && (
                  <p className="mt-1 text-sm text-slate-600">
                    New requests from your trainees will show up here. Choose “All requests” to see past decisions.
                  </p>
                )}
              </div>
            )}

            {result && result.data.length > 0 && (
              <>
                <div className="overflow-x-auto border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th scope="col" className="px-5 py-3">Trainee</th>
                        <th scope="col" className="px-5 py-3">Program and batch</th>
                        <th scope="col" className="px-5 py-3">Requested</th>
                        <th scope="col" className="px-5 py-3">Status</th>
                        <th scope="col" className="px-5 py-3">Reason</th>
                        <th scope="col" className="px-5 py-3"><span className="sr-only">Review</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.data.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">{item.trainee.name ?? 'Unknown trainee'}</p>
                            {item.trainee.systemId && <p className="text-slate-500">{item.trainee.systemId}</p>}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-slate-900">{item.enrollment.programName}</p>
                            <p className="text-slate-500">{item.enrollment.batchName}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">{formatDate(item.dateRequested)}</td>
                          <td className="px-5 py-4">
                            <WithdrawalStatusBadge status={item.status} />
                          </td>
                          <td className="max-w-xs px-5 py-4 text-slate-600">
                            <p className="truncate" title={item.reason}>{item.reason}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => update({ request: item.id })}
                              className="font-semibold text-blue-800 hover:underline"
                              aria-label={`Review the request from ${item.trainee.name ?? 'this trainee'}`}
                            >
                              {item.status === 'PENDING_VALIDATION' ? 'Review' : 'View'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Pagination
                    page={result.meta.page}
                    limit={result.meta.limit}
                    total={result.meta.total}
                    totalPages={result.meta.totalPages}
                    onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
                    onLimitChange={(next) => update({ limit: next === DEFAULT_LIMIT ? null : String(next), page: null })}
                  />
                </div>
              </>
            )}
          </section>
        </main>
      </div>
      <Footer />

      {openId && (
        <TrainerWithdrawalPanel
          key={openId}
          requestId={openId}
          onClose={closePanel}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      )}
    </div>
  )
}
