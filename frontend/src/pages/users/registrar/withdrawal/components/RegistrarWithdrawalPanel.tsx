import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ApiError } from '../../../../../api/users/trainer-withdrawal.api'
import { registrarWithdrawalApi } from '../../../../../api/users/registrar-withdrawal.api'
import type { RegistrarAction, RegistrarWithdrawalDetail } from '../../../../../types/withdrawal.type'
import WithdrawalPipeline from '../../../../../components/withdrawal/WithdrawalPipeline'
import WithdrawalStatusBadge from '../../../../../components/withdrawal/WithdrawalStatusBadge'
import { formatDate, formatDateTime, formatPeso, STATUS_LABELS } from '../../../../../components/withdrawal/withdrawal-pipeline'
import PaymentHistoryDialog from './PaymentHistoryDialog'

const MAX_REMARKS = 1000

type Checks = { finances: boolean; documents: boolean }

const CHECK_ITEMS: { key: keyof Checks; label: string }[] = [
  { key: 'finances', label: 'Finances cleared' },
  { key: 'documents', label: 'Documents / requirements submitted' },
]

type Props = {
  requestId: string
  onClose: () => void
  /** Called after the registrar approves or rejects, so the list can refresh. */
  onChanged: () => void
}

/**
 * Side panel: the whole request, the trainer's decision, the registrar's three
 * manual checks, and the approve / reject buttons.
 */
export default function RegistrarWithdrawalPanel({ requestId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<RegistrarWithdrawalDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [checks, setChecks] = useState<Checks>({ finances: false, documents: false })
  const [remarks, setRemarks] = useState('')
  const [pending, setPending] = useState<RegistrarAction | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [done, setDone] = useState<RegistrarAction | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    registrarWithdrawalApi
      .get(requestId)
      .then((response) => {
        if (!active) return
        setDetail(response)
        setLoadError(null)
      })
      .catch((err: unknown) => {
        if (!active) return
        if (err instanceof ApiError && err.status === 404) setLoadError('This request no longer exists.')
        else setLoadError(err instanceof Error ? err.message : 'Unable to load this request.')
      })
    return () => {
      active = false
    }
  }, [requestId, reloadKey])

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Escape closes the payment history first, and only then the panel.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (historyOpen) setHistoryOpen(false)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, historyOpen])

  const trimmed = remarks.trim()
  const canAct = detail?.status === 'TRAINER_VALIDATED'
  const allChecked = checks.finances && checks.documents
  // Approving needs both ticks. Rejecting needs a reason.
  // The ID is not a registrar check: the admin confirms it at sign-off.
  const approveBlocked = pending === 'APPROVE' && !allChecked
  const rejectBlocked = pending === 'REJECT' && trimmed.length === 0

  async function confirm() {
    if (!pending || approveBlocked || rejectBlocked) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await registrarWithdrawalApi.validate(requestId, {
        action: pending,
        finances_cleared: checks.finances,
        documents_submitted: checks.documents,
        ...(trimmed ? { remarks: trimmed } : {}),
      })
      setDetail(updated)
      setDone(pending)
      setPending(null)
      onChanged()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save your decision.')
      setPending(null)
      // Someone else may have acted, so show the real state.
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
        aria-labelledby="registrar-wd-panel-title"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">Withdrawal request</p>
            <h2 id="registrar-wd-panel-title" className="mt-1 truncate text-xl font-bold text-slate-900">
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

              <section aria-label="Trainer validation" className="border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">Trainer validation</h3>
                {detail.stages.trainer.by ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {detail.stages.trainer.validated ? 'Approved' : 'Rejected'} by {detail.stages.trainer.by}
                    {detail.stages.trainer.at ? ` · ${formatDateTime(detail.stages.trainer.at)}` : ''}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">The trainer has not validated this request yet.</p>
                )}
                {detail.trainerRemarks && (
                  <p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-3 text-sm text-slate-700">
                    {detail.trainerRemarks}
                  </p>
                )}
              </section>

              <section aria-label="Enrollment fee" className="border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">Enrollment fee</h3>
                {detail.enrollmentFee.paid && detail.enrollmentFee.receipt ? (
                  <p className="mt-1 text-sm text-green-800">
                    <span className="font-semibold">Paid.</span> Receipt {detail.enrollmentFee.receipt.orNumber} ·{' '}
                    {formatDate(detail.enrollmentFee.receipt.paymentDate)} · {formatPeso(detail.enrollmentFee.receipt.amount)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-amber-800">
                    <span className="font-semibold">Not paid.</span> No enrollment receipt was found for this trainee.
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  For information only. You still decide whether finances are cleared.
                </p>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="mt-3 border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-blue-800 hover:bg-slate-50"
                >
                  View payment history ({detail.enrollmentFee.payments.length})
                </button>
              </section>

              <section aria-label="Trainee documents" className="border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">Trainee documents</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {detail.requirements.submitted} / {detail.requirements.total} submitted. For information only, it
                  does not stop an approval.
                </p>
                {detail.requirements.missing.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {detail.requirements.missing.map((doc) => (
                      <li key={doc.key} className="bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                        Missing: {doc.label}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {done && (
                <p role="status" className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {done === 'APPROVE'
                    ? 'You approved this request. It now goes to the admin.'
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
                  <h3 className="text-base font-semibold text-slate-900">Your checks</h3>
                  <fieldset className="mt-3 space-y-2" disabled={saving}>
                    <legend className="sr-only">Confirm each item before approving</legend>
                    {CHECK_ITEMS.map((item) => (
                      <label key={item.key} className="flex items-center gap-3 text-sm text-slate-800">
                        <input
                          type="checkbox"
                          checked={checks[item.key]}
                          onChange={(e) => setChecks((current) => ({ ...current, [item.key]: e.target.checked }))}
                          className="h-4 w-4 border-slate-300"
                        />
                        {item.label}
                      </label>
                    ))}
                  </fieldset>

                  <label htmlFor="registrar-remarks" className="mt-4 block text-sm font-medium text-slate-800">
                    Remarks <span className="font-normal text-slate-500">(required to reject)</span>
                  </label>
                  <textarea
                    id="registrar-remarks"
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
                        disabled={!allChecked}
                        onClick={() => setPending('APPROVE')}
                        className="bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                          ? 'Approve this withdrawal request? It will go to the admin.'
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
                          disabled={saving || rejectBlocked || approveBlocked}
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
                <>
                  {detail.stages.registrar.by && (
                    <section aria-label="Registrar checks" className="border border-slate-200 p-4">
                      <h3 className="text-base font-semibold text-slate-900">Registrar checks</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {detail.stages.registrar.by}
                        {detail.stages.registrar.at ? ` · ${formatDateTime(detail.stages.registrar.at)}` : ''}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-700">
                        <li>Finances cleared: {detail.checklist.financesCleared ? 'Yes' : 'No'}</li>
                        <li>Documents submitted: {detail.checklist.documentsSubmitted ? 'Yes' : 'No'}</li>
                      </ul>
                      {detail.checklist.remarks && (
                        <p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-3 text-sm text-slate-700">
                          {detail.checklist.remarks}
                        </p>
                      )}
                    </section>
                  )}
                  {!done && (
                    <p className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {detail.status === 'PENDING_VALIDATION'
                        ? 'This request is still with the trainer. You can act once the trainer approves it.'
                        : `This request is no longer waiting for you (${STATUS_LABELS[detail.status].toLowerCase()}).`}
                    </p>
                  )}
                </>
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

      {historyOpen && detail && (
        <PaymentHistoryDialog
          traineeName={detail.trainee.name}
          payments={detail.enrollmentFee.payments}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  )
}
