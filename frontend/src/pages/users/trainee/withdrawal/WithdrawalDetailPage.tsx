import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { traineeWithdrawalApi } from '../../../../api/users/trainee-withdrawal.api'
import { OPEN_WITHDRAWAL_STATUSES, type WithdrawalDetail } from '../../../../types/withdrawal.type'
import WithdrawalPipeline from '../../../../components/withdrawal/WithdrawalPipeline'
import WithdrawalStatusBadge from '../../../../components/withdrawal/WithdrawalStatusBadge'
import { formatDate, formatDateTime, STATUS_LABELS } from '../../../../components/withdrawal/withdrawal-pipeline'

/** While a request is still open the page re-checks it, so progress shows up without a reload. */
const REFRESH_MS = 30_000

export default function WithdrawalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<WithdrawalDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const isOpen = detail ? OPEN_WITHDRAWAL_STATUSES.includes(detail.status) : false

  useEffect(() => {
    if (!id) return
    let active = true
    traineeWithdrawalApi
      .get(id)
      .then((response) => {
        if (!active) return
        setDetail(response)
        setError(null)
        setNotFound(false)
      })
      .catch((err: unknown) => {
        if (!active) return
        const message = err instanceof Error ? err.message : 'Unable to load this request.'
        // The API answers 404 for a request that is missing or belongs to someone else.
        if (/not found/i.test(message)) setNotFound(true)
        else setError(message)
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
      setDetail(await traineeWithdrawalApi.cancel(id))
      setConfirmingCancel(false)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Unable to cancel this request.')
      // The status may have changed under us (for example the trainer just acted), so refresh.
      setReloadKey((k) => k + 1)
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = detail?.status === 'PENDING_VALIDATION'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainee" />
        <main className="min-w-0 flex-1">
          <section className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
            <Link to="/trainee/withdrawal" className="text-sm font-semibold text-blue-800 hover:underline">
              ← All withdrawal requests
            </Link>

            {notFound && (
              <div className="mt-6 border border-slate-200 bg-white px-6 py-12 text-center">
                <p className="font-semibold text-slate-900">Withdrawal request not found.</p>
                <p className="mt-1 text-sm text-slate-600">It may have been removed, or it is not yours.</p>
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

            {detail && (
              <>
                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Withdrawal request</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">{detail.enrollment.programName}</h1>
                    <p className="mt-1 text-slate-600">
                      {detail.enrollment.batchName} · requested {formatDate(detail.dateRequested)}
                    </p>
                  </div>
                  <WithdrawalStatusBadge status={detail.status} />
                </div>

                <p className="mt-4 text-sm text-slate-700" aria-live="polite">
                  {detail.status === 'APPROVED' &&
                    'Your withdrawal was approved. Your enrollment is now marked as withdrawn.'}
                  {detail.status === 'REJECTED' && 'Your withdrawal request was not approved. See the reason below.'}
                  {detail.status === 'CANCELLED' && 'You cancelled this request.'}
                  {isOpen && `Current step: ${STATUS_LABELS[detail.status].toLowerCase()}.`}
                </p>

                <div className="mt-8 border border-slate-200 bg-white p-6">
                  <h2 className="mb-6 text-lg font-semibold text-slate-900">Approval progress</h2>
                  <WithdrawalPipeline detail={detail} />
                </div>

                {canCancel && (
                  <div className="mt-6 border border-slate-200 bg-white p-6">
                    <h2 className="text-lg font-semibold text-slate-900">Changed your mind?</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      You can cancel this request until your trainer has acted on it.
                    </p>
                    {cancelError && (
                      <p role="alert" className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                        {cancelError}
                      </p>
                    )}
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
                        <p className="text-sm font-medium text-slate-800">Cancel this withdrawal request?</p>
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

                <div className="mt-6 border border-slate-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">History</h2>
                  <ul className="divide-y divide-slate-100 text-sm">
                    {[...detail.history].reverse().map((entry) => (
                      <li key={entry.id} className="py-3">
                        <p className="font-medium text-slate-900">
                          {STATUS_LABELS[entry.newStatus]}
                          <span className="font-normal text-slate-500">
                            {' · '}
                            {entry.changedBy.name ?? 'Unknown'} · {formatDateTime(entry.changedAt)}
                          </span>
                        </p>
                        {entry.remarks && <p className="mt-1 text-slate-600">{entry.remarks}</p>}
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
