import { useEffect, useState, type FormEvent } from 'react'
import { traineeApi } from '../../../../../api/users/trainee.api'
import { traineeWithdrawalApi } from '../../../../../api/users/trainee-withdrawal.api'
import type { WithdrawalDetail } from '../../../../../types/withdrawal.type'

const MAX_REASON = 1000

type EnrollmentOption = { id: string; label: string }

type Props = {
  onCreated: (created: WithdrawalDetail) => void
  onClose: () => void
}

/** Starts a withdrawal request. Only the trainee's ENROLLED enrollments can be chosen. */
export default function WithdrawalRequestForm({ onCreated, onClose }: Props) {
  const [options, setOptions] = useState<EnrollmentOption[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [enrollmentId, setEnrollmentId] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    traineeApi
      .dashboard()
      .then((payload) => {
        if (!active) return
        const enrolled = payload.enrollments
          .filter((e) => e.enrollmentStatus === 'ENROLLED')
          .map((e) => ({ id: e.enrollmentId, label: `${e.program.name} — ${e.batch.batchName}` }))
        setOptions(enrolled)
        if (enrolled.length === 1) setEnrollmentId(enrolled[0].id)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load your enrollments.')
      })
    return () => {
      active = false
    }
  }, [])

  const trimmed = reason.trim()
  const canSubmit = Boolean(enrollmentId) && trimmed.length > 0 && !submitting

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await traineeWithdrawalApi.create({
        enrollment_id: enrollmentId,
        requested_reason: trimmed,
      })
      onCreated(created)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit your request.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-slate-200 bg-white p-6" aria-label="New withdrawal request">
      <h2 className="text-lg font-semibold text-slate-900">New withdrawal request</h2>
      <p className="mt-1 text-sm text-slate-600">
        Your request goes to your trainer first, then the registrar, then the administrator. You can cancel it
        until your trainer has acted on it.
      </p>

      {loadError && (
        <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </p>
      )}

      {options === null && !loadError && <p className="mt-4 text-sm text-slate-500">Loading your enrollments…</p>}

      {options !== null && options.length === 0 && (
        <p className="mt-4 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          You have no active enrollment to withdraw from.
        </p>
      )}

      {options !== null && options.length > 0 && (
        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="withdrawal-enrollment" className="block text-sm font-medium text-slate-800">
              Enrollment
            </label>
            <select
              id="withdrawal-enrollment"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            >
              <option value="">Choose the enrollment you are withdrawing from</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="withdrawal-reason" className="block text-sm font-medium text-slate-800">
              Reason for withdrawing
            </label>
            <textarea
              id="withdrawal-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={MAX_REASON}
              rows={5}
              required
              className="mt-1 w-full border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700"
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {reason.length}/{MAX_REASON}
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {submitError}
        </p>
      )}

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Close
        </button>
        {options !== null && options.length > 0 && (
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        )}
      </div>
    </form>
  )
}
