import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ApiError } from '../../../../../api/users/trainer-withdrawal.api'
import { adminWithdrawalApi } from '../../../../../api/users/admin-withdrawal.api'
import type { AdminAction, AdminWithdrawalDetail } from '../../../../../types/withdrawal.type'
import WithdrawalPipeline from '../../../../../components/withdrawal/WithdrawalPipeline'
import WithdrawalStatusBadge from '../../../../../components/withdrawal/WithdrawalStatusBadge'
import {
  formatDate,
  formatDateTime,
  formatPeso,
  STATUS_LABELS,
} from '../../../../../components/withdrawal/withdrawal-pipeline'
import DecisionChip from './DecisionChip'

const MAX_REMARKS = 1000

type Props = {
  requestId: string
  onClose: () => void
  /** Called after the admin signs off, so the list can refresh. */
  onChanged: () => void
}

/**
 * Side panel: the whole pipeline in one place (trainee, trainer, registrar,
 * timeline) and the admin's sign-off. Approving needs the "ID surrendered" tick.
 */
export default function AdminWithdrawalDetailPanel({ requestId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<AdminWithdrawalDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [idSurrendered, setIdSurrendered] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [pending, setPending] = useState<AdminAction | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [done, setDone] = useState<AdminAction | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    adminWithdrawalApi
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const trimmed = remarks.trim()
  const canAct = detail?.status === 'PENDING_ADMIN_SIGNOFF' && done === null
  // Approving needs the ID tick. Rejecting needs nothing, remarks are optional.
  const approveBlocked = pending === 'APPROVE' && !idSurrendered

  async function confirm() {
    if (!pending || approveBlocked) return
    setSaving(true)
    setActionError(null)
    try {
      const updated = await adminWithdrawalApi.signOff(requestId, {
        action: pending,
        surrendered_id: idSurrendered,
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
        aria-labelledby="admin-wd-panel-title"
        className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">Withdrawal request</p>
            <h2 id="admin-wd-panel-title" className="mt-1 truncate text-xl font-bold text-slate-900">
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
                <p className="text-sm text-slate-600">
                  Requested {formatDate(detail.dateRequested)} · Enrollment {detail.enrollment.status.toLowerCase()}
                </p>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Reason given by the trainee</p>
                  <p className="mt-1 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-3 text-sm text-slate-700">
                    {detail.reason}
                  </p>
                </div>
              </section>

              <section aria-label="Trainer validation" className="border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">Trainer validation</h3>
                  <DecisionChip value={detail.trainerStatus} />
                </div>
                {detail.stages.trainer.by ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {detail.stages.trainer.by}
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

              <section aria-label="Registrar validation" className="border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">Registrar validation</h3>
                  <DecisionChip value={detail.registrarStatus} />
                </div>
                {detail.stages.registrar.by ? (
                  <>
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
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">The registrar has not validated this request yet.</p>
                )}
              </section>

              <section aria-label="Enrollment fee and documents" className="border border-slate-200 p-4">
                <h3 className="text-base font-semibold text-slate-900">Fee and documents</h3>
                {detail.enrollmentFee.paid && detail.enrollmentFee.receipt ? (
                  <p className="mt-1 text-sm text-green-800">
                    <span className="font-semibold">Enrollment fee paid.</span> Receipt{' '}
                    {detail.enrollmentFee.receipt.orNumber} · {formatDate(detail.enrollmentFee.receipt.paymentDate)} ·{' '}
                    {formatPeso(detail.enrollmentFee.receipt.amount)}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-amber-800">
                    <span className="font-semibold">Enrollment fee not found.</span> No enrollment receipt exists for
                    this enrollment.
                  </p>
                )}
                <p className="mt-1 text-sm text-slate-600">
                  Documents: {detail.requirements.submitted} / {detail.requirements.total} submitted.
                </p>
                <p className="mt-1 text-xs text-slate-500">For information only. The registrar already decided these.</p>
              </section>

              {done && (
                <p role="status" className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {done === 'APPROVE'
                    ? 'You approved this request. The enrollment is now withdrawn.'
                    : 'You rejected this request. The enrollment stays as it was.'}
                </p>
              )}
              {actionError && (
                <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {actionError}
                </p>
              )}

              {canAct ? (
                <section aria-label="Your sign-off" className="border border-slate-200 p-4">
                  <h3 className="text-base font-semibold text-slate-900">Your sign-off</h3>
                  <fieldset className="mt-3" disabled={saving}>
                    <legend className="sr-only">Confirm the ID before approving</legend>
                    <label className="flex items-center gap-3 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={idSurrendered}
                        onChange={(e) => setIdSurrendered(e.target.checked)}
                        className="h-4 w-4 border-slate-300"
                      />
                      ID surrendered (the trainee handed in their ID)
                    </label>
                    <p className="mt-1 pl-7 text-xs text-slate-500">Required to approve.</p>
                  </fieldset>

                  <label htmlFor="admin-remarks" className="mt-4 block text-sm font-medium text-slate-800">
                    Remarks <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  <textarea
                    id="admin-remarks"
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
                        disabled={!idSurrendered}
                        onClick={() => setPending('APPROVE')}
                        className="bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Approve sign-off
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
                          ? 'Approve this withdrawal? The enrollment will be set to withdrawn.'
                          : 'Reject this withdrawal request? The enrollment stays as it is and this ends the request.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={saving || approveBlocked}
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
                  {detail.stages.admin.by && (
                    <section aria-label="Admin sign-off" className="border border-slate-200 p-4">
                      <h3 className="text-base font-semibold text-slate-900">Admin sign-off</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {detail.stages.admin.by}
                        {detail.stages.admin.at ? ` · ${formatDateTime(detail.stages.admin.at)}` : ''}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">ID surrendered: {detail.idSurrendered ? 'Yes' : 'No'}</p>
                      {detail.adminRemarks && (
                        <p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-3 text-sm text-slate-700">
                          {detail.adminRemarks}
                        </p>
                      )}
                    </section>
                  )}
                  {!done && detail.status !== 'PENDING_ADMIN_SIGNOFF' && (
                    <p className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {detail.status === 'PENDING_VALIDATION' || detail.status === 'TRAINER_VALIDATED'
                        ? `This request is not ready for you yet (${STATUS_LABELS[detail.status].toLowerCase()}). You can sign off once the trainer and then the registrar approve it.`
                        : `This request is no longer waiting for you (${STATUS_LABELS[detail.status].toLowerCase()}).`}
                    </p>
                  )}
                </>
              )}

              <section aria-label="Approval progress">
                <h3 className="mb-4 text-base font-semibold text-slate-900">Approval progress</h3>
                <WithdrawalPipeline detail={detail} audience="staff" />
              </section>

              <section aria-label="Timeline">
                <h3 className="mb-2 text-base font-semibold text-slate-900">Timeline</h3>
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
