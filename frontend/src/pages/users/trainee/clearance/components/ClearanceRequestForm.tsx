import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { traineeClearanceApi } from '../../../../../api/users/trainee-clearance.api'
import ClearanceFormInfo from '../../../../../components/clearance/ClearanceFormInfo'
import { CERTIFICATE_LABELS } from '../../../../../components/clearance/clearance-format'
import type { CertificateType, ClearanceDetail, ClearanceFormOption } from '../../../../../types/clearance.type'

const MAX_PURPOSE = 500
const MAX_OTHER = 100
const CERTIFICATES = Object.keys(CERTIFICATE_LABELS) as CertificateType[]
const FIELD =
  'mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700'

type Props = {
  onCreated: (created: ClearanceDetail) => void
  onClose: () => void
}

/** The online "Clearance and Certificate Request Form". */
export default function ClearanceRequestForm({ onCreated, onClose }: Props) {
  const [options, setOptions] = useState<ClearanceFormOption[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [enrollmentId, setEnrollmentId] = useState('')
  const [certificates, setCertificates] = useState<CertificateType[]>([])
  const [other, setOther] = useState('')
  const [purpose, setPurpose] = useState('')
  const [certified, setCertified] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [problems, setProblems] = useState<string[]>([])

  useEffect(() => {
    let active = true
    traineeClearanceApi
      .formOptions()
      .then(({ enrollments }) => {
        if (!active) return
        setOptions(enrollments)
        const available = enrollments.filter((e) => !e.openRequestId)
        if (available.length === 1) setEnrollmentId(available[0].enrollmentId)
      })
      .catch((err: unknown) => {
        if (active) setLoadError(err instanceof Error ? err.message : 'Unable to load your enrollments.')
      })
    return () => {
      active = false
    }
  }, [])

  const selected = options?.find((o) => o.enrollmentId === enrollmentId) ?? null
  const available = options?.filter((o) => !o.openRequestId) ?? []
  const open = options?.filter((o) => o.openRequestId) ?? []
  const wantsOther = certificates.includes('OTHER')

  function toggle(type: CertificateType) {
    setCertificates((chosen) => (chosen.includes(type) ? chosen.filter((c) => c !== type) : [...chosen, type]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const missing = [
      !enrollmentId && 'Choose the program you are requesting for.',
      certificates.length === 0 && 'Choose at least one certificate.',
      wantsOther && !other.trim() && 'Name the other certificate.',
      !purpose.trim() && 'Enter the purpose of the request.',
      !certified && 'Tick the certification box to submit.',
    ].filter((message): message is string => Boolean(message))
    setProblems(missing)
    if (missing.length > 0 || submitting) return

    setSubmitting(true)
    try {
      onCreated(
        await traineeClearanceApi.create({
          enrollment_id: enrollmentId,
          certificates,
          ...(wantsOther ? { other_specify: other.trim() } : {}),
          purpose_of_request: purpose.trim(),
          certified,
        }),
      )
    } catch (err) {
      setProblems([err instanceof Error ? err.message : 'Unable to submit your request.'])
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      // Old messages go away as soon as the trainee changes something.
      onChange={() => setProblems([])}
      className="border border-slate-200 bg-white p-6"
      aria-label="Clearance and Certificate Request Form"
    >
      <h2 className="text-lg font-semibold text-slate-900">Clearance and Certificate Request Form</h2>
      <p className="mt-1 text-sm text-slate-600">
        Your request goes to your trainer, then the registrar, then the encoder. A control number is given when you
        submit.
      </p>

      {loadError && (
        <p role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {loadError}
        </p>
      )}

      {options === null && !loadError && <p className="mt-4 text-sm text-slate-500">Loading your enrollments…</p>}

      {options !== null && options.length === 0 && (
        <p className="mt-4 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Only an enrolled or completed program can request a clearance. You have none.
        </p>
      )}

      {open.map((o) => (
        <p key={o.enrollmentId} className="mt-4 border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          A request for {o.programName} is already in progress.{' '}
          <Link to={`/trainee/clearance-requests/${o.openRequestId}`} className="font-semibold underline">
            View it
          </Link>
        </p>
      ))}

      {available.length > 0 && (
        <div className="mt-5 space-y-6">
          <div>
            <label htmlFor="clearance-enrollment" className="block text-sm font-medium text-slate-800">
              Program
            </label>
            <select
              id="clearance-enrollment"
              value={enrollmentId}
              onChange={(e) => setEnrollmentId(e.target.value)}
              className={FIELD}
            >
              <option value="">Choose the program you are requesting for</option>
              {available.map((o) => (
                <option key={o.enrollmentId} value={o.enrollmentId}>
                  {o.programName} — {o.batchName}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <fieldset className="border border-slate-200 bg-slate-50 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-900">Trainee information</legend>
              <ClearanceFormInfo info={selected} />
            </fieldset>
          )}

          <fieldset>
            <legend className="text-sm font-medium text-slate-800">Certificate request</legend>
            <div className="mt-2 space-y-2">
              {CERTIFICATES.map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm text-slate-800">
                  <input
                    type="checkbox"
                    checked={certificates.includes(type)}
                    onChange={() => toggle(type)}
                    className="h-4 w-4 accent-blue-900"
                  />
                  {CERTIFICATE_LABELS[type]}
                </label>
              ))}
            </div>
            {wantsOther && (
              <input
                type="text"
                aria-label="Other certificate"
                placeholder="Name the other certificate"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                maxLength={MAX_OTHER}
                className={FIELD}
              />
            )}
          </fieldset>

          <div>
            <label htmlFor="clearance-purpose" className="block text-sm font-medium text-slate-800">
              Purpose of request
            </label>
            <textarea
              id="clearance-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={MAX_PURPOSE}
              rows={3}
              className={FIELD}
            />
            <p className="mt-1 text-right text-xs text-slate-500">
              {purpose.length}/{MAX_PURPOSE}
            </p>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-slate-800">Student's certification</legend>
            <label className="mt-2 flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                checked={certified}
                onChange={(e) => setCertified(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-900"
              />
              <span>
                I, {selected?.trainee.name ?? 'the trainee'}, certify that the information provided above is true and
                correct. I understand that the requested certificate shall only be released upon completion of all
                clearance requirements.
              </span>
            </label>
          </fieldset>
        </div>
      )}

      {problems.length > 0 && (
        <ul role="alert" className="mt-4 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
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
        {available.length > 0 && (
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        )}
      </div>
    </form>
  )
}
