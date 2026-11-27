import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { ClearanceApiError, traineeClearanceApi } from '../../../../api/users/trainee-clearance.api'
import ClaimStub from '../../../../components/clearance/ClaimStub'
import ClearanceFormInfo from '../../../../components/clearance/ClearanceFormInfo'
import ClearanceProgress from '../../../../components/clearance/ClearanceProgress'
import ClearanceStatusBadge from '../../../../components/clearance/ClearanceStatusBadge'
import {
  certificateText,
  formatDateTime,
  OPEN_STATUSES,
  STATUS_LABELS,
} from '../../../../components/clearance/clearance-format'
import type { ClearanceDetail } from '../../../../types/clearance.type'

/** While a request is still open the page re-checks it, so progress shows up without a reload. */
const REFRESH_MS = 30_000

const STATUS_MESSAGES: Partial<Record<ClearanceDetail['status'], string>> = {
  RELEASED: 'Your request has been released.',
  REJECTED: 'Your request was rejected. See the reason below. You can send a new request.',
  CANCELLED: 'You cancelled this request. You can send a new one.',
}

export default function ClearanceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ClearanceDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const isOpen = detail ? OPEN_STATUSES.includes(detail.status) : false

  useEffect(() => {
    if (!id) return
    let active = true
    traineeClearanceApi
      .get(id)
      .then((response) => {
        if (!active) return
        setDetail(response)
        setError(null)
        setNotFound(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        // 403 for a missing or someone else's request, 400 for a malformed id.
        if (err instanceof ClearanceApiError && [400, 403].includes(err.status)) setNotFound(true)
        else setError(err instanceof Error ? err.message : 'Unable to load this request.')
      })
    return () => {
      active = false
    }
  }, [id, reloadKey])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setInterval(() => setReloadKey((k) => k + 1), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [isOpen])

  async function handleCancel() {
    if (!id) return
    setCancelling(true)
    setCancelError(null)
    try {
      setDetail(await traineeClearanceApi.cancel(id))
      setConfirmingCancel(false)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Unable to cancel this request.')
      // The status may have changed under us (for example the trainer just acted), so refresh.
      setReloadKey((k) => k + 1)
    } finally {
      setCancelling(false)
    }
  }

  const showStub = detail?.status === 'PROCESSED' || detail?.status === 'RELEASED'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainee" />
        <main className="min-w-0 flex-1">
          <section className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
            <Link to="/trainee/clearance-requests" className="text-sm font-semibold text-blue-800 hover:underline">
              ← All clearance requests
            </Link>

            {notFound && (
              <div className="mt-6 border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="font-semibold text-slate-900">Clearance request not found.</p>
                <p className="mt-1 text-sm text-slate-600">It may not exist, or it is not yours.</p>
              </div>
            )}

            {error && (
              <div role="alert" className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}{' '}
                <button type="button" className="font-semibold underline" onClick={() => setReloadKey((k) => k + 1)}>
                  Try again
                </button>
              </div>
            )}

            {!detail && !error && !notFound && <p className="mt-6 text-sm text-slate-500">Loading…</p>}

            {detail && !notFound && (
              <>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                      Clearance request
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">{detail.controlNumber}</h1>
                    <p className="mt-1 text-slate-600">
                      {detail.form.programName} · requested {formatDateTime(detail.requestedAt)}
                    </p>
                  </div>
                  <ClearanceStatusBadge status={detail.status} />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-700" aria-live="polite">
                  {STATUS_MESSAGES[detail.status] ?? `${STATUS_LABELS[detail.status]}.`}
                </p>

                {showStub && (
                  <div className="mt-8">
                    <ClaimStub detail={detail} />
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="mt-3 bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      Print claim stub
                    </button>
                  </div>
                )}

                <div className="mt-8 border border-slate-200 bg-white p-6">
                  <h2 className="mb-6 text-lg font-semibold text-slate-900">Progress</h2>
                  <ClearanceProgress detail={detail} />
                </div>

                {detail.status === 'PENDING_VALIDATION' && (
                  <div className="mt-6 border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Cancel the request</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      You can cancel this request until your trainer has acted on it.
                    </p>
                    {!confirmingCancel ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(true)}
                        className="mt-4 border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Cancel this request
                      </button>
                    ) : (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <p className="text-sm font-medium text-slate-800">Cancel this clearance request?</p>
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={handleCancel}
                          className="bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
                        >
                          {cancelling ? 'Cancelling…' : 'Yes, cancel it'}
                        </button>
                        <button
                          type="button"
                          disabled={cancelling}
                          onClick={() => setConfirmingCancel(false)}
                          className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Keep it
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Outside the box above: it stays visible after a failed cancel moved the status on. */}
                {cancelError && (
                  <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {cancelError}
                  </p>
                )}

                <div className="mt-6 border border-slate-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">The form</h2>
                  <ClearanceFormInfo info={detail.form} />
                  <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">Certificate request</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">
                        {detail.certificates.map(certificateText).join(', ')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Purpose of request</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium text-slate-900">
                        {detail.purpose}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Student's certification</dt>
                      <dd className="mt-0.5 font-medium text-slate-900">
                        {detail.certified ? `Certified ${formatDateTime(detail.certifiedAt)}` : 'Not certified'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 border border-slate-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">History</h2>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {[...detail.history].reverse().map((entry) => (
                      <li key={entry.id} className="py-3">
                        <p className="font-medium text-slate-900">
                          {entry.oldStatus === null ? 'Submitted' : STATUS_LABELS[entry.newStatus]}
                          <span className="font-normal text-slate-500">
                            {' · '}
                            {entry.changedBy.name ?? 'Unknown'} ({entry.changedBy.role.toLowerCase()}) ·{' '}
                            {formatDateTime(entry.changedAt)}
                          </span>
                        </p>
                        {entry.remarks && <p className="mt-1 break-words text-slate-600">{entry.remarks}</p>}
                      </li>
                    ))}
                  </ul>
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
