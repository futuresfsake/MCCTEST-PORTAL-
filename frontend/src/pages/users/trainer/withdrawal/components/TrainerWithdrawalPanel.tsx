import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ApiError, trainerWithdrawalApi } from '../../../../../api/users/trainer-withdrawal.api'
import type { TrainerAction, TrainerWithdrawalDetail } from '../../../../../types/withdrawal.type'
import WithdrawalPipeline from '../../../../../components/withdrawal/WithdrawalPipeline'
import WithdrawalStatusBadge from '../../../../../components/withdrawal/WithdrawalStatusBadge'
import { formatDate, formatDateTime, STATUS_LABELS } from '../../../../../components/withdrawal/withdrawal-pipeline'

const MAX_REMARKS = 1000

type Props = {
  requestId: string
  onClose: () => void
  /** Called after the trainer approves or rejects, so the list can refresh. */
  onChanged: () => void
}

/** Side panel: the whole request, the progress so far, and the trainer's decision. */
export default function TrainerWithdrawalPanel({ requestId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<TrainerWithdrawalDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [remarks, setRemarks] = useState('')
  const [pending, setPending] = useState<TrainerAction | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [done, setDone] = useState<TrainerAction | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    trainerWithdrawalApi
      .get(requestId)
      .then((response) => {
        if (!active) return
        setDetail(response)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 403) setLoadError('This request is not from one of your batches.')
        else if (err instanceof ApiError && err.status === 404) setLoadError('This request no longer exists.')
        else setLoadError(err instanceof Error ? err.message : 'Unable to load this request.')
      })
    return () => {
      active = false
    }
  }, [requestId, reloadKey])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const trimmed = remarks.trim()
  const canAct = detail?.status === 'PENDING_VALIDATION'
  // A rejection needs a reason, so the trainee can see why (decision D-07).
  const rejectBlocked = pending === 'REJECT' && trimmed.length === 0

  async function confirm() {
    if (!pending || rejectBlocked) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await trainerWithdrawalApi.validate(requestId, {
        action: pending,
        ...(trimmed ? { remarks: trimmed } : {}),
      })
      setDetail(updated)
      setDone(pending)
      setPending(null)
      onChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save your decision.')
      setPending(null)
      // Someone else may have acted (for example the trainee cancelled), so show the real state.
      setReloadKey((k) => k + 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdrawal-panel-title"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">Withdrawal request</p>
            <h2 id="withdrawal-panel-title" className="mt-1 truncate text-xl font-bold text-slate-900">
              {detail ? (detail.trainee.name ?? 'Unknown trainee') : 'Loading…'}
            </h2>
            {detail?.trainee.systemId && <p className="text-sm text-slate-500">{detail.trainee.systemId}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-6 px-6 py-6">
          {loadError && (
            <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {loadError}{' '}
              <button type="button" className="font-semibold underline" onClick={() => setReloadKey((k) => k + 1)}>
                Try again
              </button>
            </div>
          )}

          {detail && (
            <>
              <section aria-label="Request details" className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-slate-700">
                    {detail.enrollment.programName}
                    <span className="text-slate-500"> · {detail.enrollment.batchName}</span>
                  </p>
                  <WithdrawalStatusBadge status={detail.status} />
                </div>
                <p className="text-sm text-slate-600">Requested {formatDate(detail.dateRequested)}</p>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Reason given by the trainee</p>
                  <p className="mt-1 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-3 text-sm text-slate-700">
                    {detail.reason}
                  </p>
                </div>
              </section>

              {done && (
                <p role="status" className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {done === 'APPROVE'
                    ? 'You approved this request. It now goes to the registrar.'
                    : 'You rejected this request. The trainee can see your reason.'}
                </p>
              )}
              {actionError && (
                <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {actionError}
                </p>
              )}

              {canAct ? (
                <section aria-label="Your decision" className="border border-slate-200 p-4">
                  <h3 className="text-base font-semibold text-slate-900">Your decision</h3>
                  <label htmlFor="trainer-remarks" className="mt-3 block text-sm font-medium text-slate-800">
                    Remarks <span className="font-normal text-slate-500">(required to reject)</span>
                  </label>
                  <textarea
                    id="trainer-remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    maxLength={MAX_REMARKS}
                    rows={4}
                    disabled={saving}
                    className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
                  />
                  <p className="mt-1 text-right text-xs text-slate-500">
                    {remarks.length}/{MAX_REMARKS}
                  </p>

                  {pending === null ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setPending('APPROVE')}
                        className="bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setPending('REJECT')}
                        className="border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 border border-slate-200 bg-slate-50 p-3" role="group" aria-label="Confirm your decision">
                      <p className="text-sm font-medium text-slate-900">
                        {pending === 'APPROVE'
                          ? 'Approve this withdrawal request? It will go to the registrar.'
                          : 'Reject this withdrawal request? This ends the request.'}
                      </p>
                      {rejectBlocked && (
                        <p role="alert" className="mt-2 text-sm text-red-700">
                          Write a reason first, so the trainee knows why it was rejected.
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={saving || rejectBlocked}
                          onClick={confirm}
                          className={`px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${
                            pending === 'APPROVE' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-700 hover:bg-red-800'
                          }`}
                        >
                          {saving ? 'Saving…' : pending === 'APPROVE' ? 'Yes, approve' : 'Yes, reject'}
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => setPending(null)}
                          className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Go back
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                !done && (
                  <p className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    This request is no longer waiting for you ({STATUS_LABELS[detail.status].toLowerCase()}).
                  </p>
                )
              )}

              <section aria-label="Approval progress">
                <h3 className="mb-4 text-base font-semibold text-slate-900">Approval progress</h3>
                <WithdrawalPipeline detail={detail} audience="staff" />
              </section>

              <section aria-label="History">
                <h3 className="mb-2 text-base font-semibold text-slate-900">History</h3>
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
              </section>
            </>
          )}

          {!detail && !loadError && <p className="text-sm text-slate-500">Loading…</p>}
        </div>
      </aside>
    </div>
  )
}
