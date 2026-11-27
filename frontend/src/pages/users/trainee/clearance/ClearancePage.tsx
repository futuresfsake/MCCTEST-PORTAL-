import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { Pagination } from '../../../../components/common/Pagination'
import { traineeClearanceApi } from '../../../../api/users/trainee-clearance.api'
import ClearanceStatusBadge from '../../../../components/clearance/ClearanceStatusBadge'
import { certificateText, formatDate, STATUS_LABELS } from '../../../../components/clearance/clearance-format'
import type { ClearanceListResponse, ClearanceStatus } from '../../../../types/clearance.type'
import ClearanceRequestForm from './components/ClearanceRequestForm'

const DEFAULT_LIMIT = 10
const STATUSES = Object.keys(STATUS_LABELS) as ClearanceStatus[]

function readStatus(value: string | null): ClearanceStatus | '' {
  return STATUSES.includes(value as ClearanceStatus) ? (value as ClearanceStatus) : ''
}

/** The trainee's own clearance requests, plus the form to send a new one. */
export default function ClearancePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1)
  const limit = [10, 20, 50].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : DEFAULT_LIMIT
  const status = readStatus(params.get('status'))

  const [result, setResult] = useState<ClearanceListResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    traineeClearanceApi
      .list({ page, limit, status })
      .then((response) => {
        if (!active) return
        setResult(response)
        setError(null)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load your requests.')
      })
    return () => {
      active = false
    }
  }, [page, limit, status, reloadKey])

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
        <Sidebar variant="trainee" />
        <main className="min-w-0 flex-1">
          <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Certification</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Clearance</h1>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Request your clearance and certificate, and follow who still has to act.
                </p>
              </div>
              {!showForm && (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  New request
                </button>
              )}
            </div>

            {showForm && (
              <div className="mb-8">
                <ClearanceRequestForm
                  onClose={() => setShowForm(false)}
                  onCreated={(created) => navigate(`/trainee/clearance-requests/${created.id}`)}
                />
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label htmlFor="clearance-status-filter" className="text-sm font-medium text-slate-700">
                Status
              </label>
              <select
                id="clearance-status-filter"
                value={status}
                onChange={(e) => update({ status: e.target.value || null, page: null })}
                className="border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
              >
                <option value="">All requests</option>
                {STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}{' '}
                <button type="button" className="font-semibold underline" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </button>
              </div>
            )}

            {loading && <p className="text-sm text-slate-500">Loading your requests…</p>}

            {result && result.data.length === 0 && (
              <div className="border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="font-semibold text-slate-900">
                  {result.meta.total > 0
                    ? 'No requests on this page.'
                    : status
                      ? 'No requests with this status.'
                      : 'You have not made a clearance request.'}
                </p>
                {result.meta.total > 0 && (
                  <button
                    type="button"
                    className="mt-2 text-sm font-semibold text-blue-800 underline"
                    onClick={() => update({ page: null })}
                  >
                    Go to the first page
                  </button>
                )}
              </div>
            )}

            {result && result.data.length > 0 && (
              <>
                <div className="overflow-x-auto border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      <tr>
                        <th scope="col" className="px-5 py-3">Control No.</th>
                        <th scope="col" className="px-5 py-3">Certificate requested</th>
                        <th scope="col" className="px-5 py-3">Status</th>
                        <th scope="col" className="px-5 py-3">Date</th>
                        <th scope="col" className="px-5 py-3"><span className="sr-only">Open</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {result.data.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                            {item.controlNumber}
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-slate-900">{item.certificates.map(certificateText).join(', ')}</p>
                            <p className="text-slate-500">
                              {item.programName} · {item.batchName}
                            </p>
                          </td>
                          <td className="px-5 py-4">
                            <ClearanceStatusBadge status={item.status} />
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-700">{formatDate(item.requestedAt)}</td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <Link
                              to={`/trainee/clearance-requests/${item.id}`}
                              className="font-semibold text-blue-800 hover:underline"
                            >
                              View progress
                            </Link>
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
    </div>
  )
}
