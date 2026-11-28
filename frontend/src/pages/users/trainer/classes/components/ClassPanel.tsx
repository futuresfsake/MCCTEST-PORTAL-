import { useEffect, useState } from 'react'
import { ClassApiError, trainerClassesApi } from '../../../../../api/users/trainer-classes.api'
import { BatchStatusBadge } from '../../../../../components/registrar/batches/BatchStatusBadge'
import { enumLabel, formatDateOnly, formatTime } from '../../../../../components/trainee-information/format'
import {
  SCHEDULE_CHANGE_LABELS,
  SCHEDULE_REASON_MAX,
  SCHEDULE_REASON_MIN,
} from '../../../../../types/class-management.type'
import type { ClassDetail, ExpectedBatch, TraineeConflict } from '../../../../../types/class-management.type'

type Action = 'startDate' | 'start' | 'endDate' | 'close'

const ACTION_TITLES: Record<Action, string> = {
  startDate: 'Confirm or change the start date',
  start: 'Mark as started',
  endDate: 'Change the end date',
  close: 'Close the batch',
}

const inputClass =
  'w-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-900 disabled:bg-slate-100'

/** Today's local date as YYYY-MM-DD. */
function todayValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/** Adds whole days to a YYYY-MM-DD date. */
function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

function ConfirmedLabel({ batch }: { batch: ClassDetail }) {
  return batch.confirmed ? (
    <span className="text-xs font-semibold text-green-700">
      Confirmed by trainer{batch.confirmedBy ? ` (${batch.confirmedBy})` : ''}
    </span>
  ) : (
    <span className="text-xs font-semibold text-slate-500">Planned</span>
  )
}

function ConflictList({ conflicts }: { conflicts: TraineeConflict[] }) {
  if (conflicts.length === 0) return null
  return (
    <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-semibold">
        {conflicts.length} {conflicts.length === 1 ? 'trainee' : 'trainees'} would have a schedule conflict:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {conflicts.map((c) => (
          <li key={c.traineeId}>
            {c.name}
            {c.systemId ? ` (${c.systemId})` : ''}: {c.reason}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface ClassPanelProps {
  batchId: string
  onClose: () => void
  /** Called after a save, so the list shows the new values. */
  onChanged: (message: string) => void
}

/** Side panel: one batch, the actions its status allows, and its history. */
export default function ClassPanel({ batchId, onClose, onChanged }: ClassPanelProps) {
  const [batch, setBatch] = useState<ClassDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [action, setAction] = useState<Action | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endEdited, setEndEdited] = useState(false)
  const [reason, setReason] = useState('')
  const [notify, setNotify] = useState(true)
  const [conflicts, setConflicts] = useState<TraineeConflict[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    trainerClassesApi
      .get(batchId)
      .then((loaded) => active && setBatch(loaded))
      .catch((err: unknown) => active && setLoadError(err instanceof Error ? err.message : 'Unable to load the batch.'))
    return () => {
      active = false
    }
  }, [batchId])

  // Preview: which trainees the proposed dates would put in conflict.
  const checkStart = action === 'startDate' ? startDate : batch?.startDate
  const checkEnd = action === 'startDate' || action === 'endDate' ? endDate : ''
  useEffect(() => {
    if (!batch || !checkStart || !checkEnd || checkEnd <= checkStart) {
      setConflicts([])
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      trainerClassesApi
        .dateCheck(batch.id, checkStart, checkEnd)
        .then((result) => active && setConflicts(result.conflicts))
        .catch(() => active && setConflicts([]))
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [batch, checkStart, checkEnd])

  function openAction(next: Action) {
    if (!batch) return
    setAction(next)
    setStartDate(batch.startDate)
    setEndDate(batch.endDate)
    setEndEdited(false)
    setReason('')
    setNotify(true)
    setError(null)
    setConflicts([])
  }

  function changeStartDate(value: string) {
    setStartDate(value)
    // The training keeps its length unless the trainer edits the end date.
    if (batch && value && !endEdited) setEndDate(addDays(batch.endDate, daysBetween(batch.startDate, value)))
  }

  async function save() {
    if (!batch || !action) return
    const trimmed = reason.trim()
    if (trimmed.length < SCHEDULE_REASON_MIN) {
      setError(`The reason must be at least ${SCHEDULE_REASON_MIN} characters.`)
      return
    }
    if ((action === 'startDate' || action === 'endDate') && endDate <= (action === 'startDate' ? startDate : batch.startDate)) {
      setError('The end date must be after the start date.')
      return
    }

    const expected: ExpectedBatch = {
      expectedStartDate: batch.startDate,
      expectedEndDate: batch.endDate,
      expectedStatus: batch.status,
    }
    setSaving(true)
    setError(null)
    try {
      let updated: ClassDetail
      let message: string
      if (action === 'startDate') {
        updated = await trainerClassesApi.setStartDate(batch.id, { ...expected, reason: trimmed, startDate, endDate, notifyTrainees: notify })
        message = `Start date confirmed: ${formatDateOnly(updated.startDate)}.`
      } else if (action === 'start') {
        updated = await trainerClassesApi.start(batch.id, { ...expected, reason: trimmed })
        message = `${updated.batchName} has started.`
      } else if (action === 'endDate') {
        updated = await trainerClassesApi.setEndDate(batch.id, { ...expected, reason: trimmed, endDate, notifyTrainees: notify })
        message = `End date changed to ${formatDateOnly(updated.endDate)}.`
      } else {
        updated = await trainerClassesApi.close(batch.id, { ...expected, reason: trimmed })
        message = `${updated.batchName} is closed.`
      }
      setBatch(updated)
      setAction(null)
      onChanged(message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save the change.')
      if (err instanceof ClassApiError && err.conflicts.length > 0) setConflicts(err.conflicts)
    } finally {
      setSaving(false)
    }
  }

  const today = todayValue()
  const canStart = batch?.status === 'OPEN' && batch.startDate <= today

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close panel" onClick={onClose} className="absolute inset-0 bg-slate-950/40" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="class-panel-title"
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">{batch?.program.name ?? 'Batch'}</p>
            <h2 id="class-panel-title" className="mt-1 truncate text-xl font-bold text-slate-900">
              {batch?.batchName ?? 'Loading...'}
            </h2>
            {batch && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <BatchStatusBadge status={batch.status} />
                <ConfirmedLabel batch={batch} />
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-900">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {loadError && <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
          {!loadError && !batch && <p className="text-sm text-slate-500">Loading the batch...</p>}

          {batch && (
            <>
              <dl className="grid grid-cols-2 gap-4 border border-slate-200 bg-slate-50 p-4 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Start date</dt>
                  <dd className="font-medium text-slate-900">{formatDateOnly(batch.startDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">End date</dt>
                  <dd className="font-medium text-slate-900">{formatDateOnly(batch.endDate)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Enrolled</dt>
                  <dd className="font-medium text-slate-900">
                    {batch.enrolled} of {batch.capacity}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Class days and time</dt>
                  <dd className="font-medium text-slate-900">
                    {batch.schedules.length === 0
                      ? '—'
                      : batch.schedules.map((s) => (
                          <span key={`${s.name}-${s.startTime}`} className="block">
                            {s.days.map(enumLabel).join(', ')} · {formatTime(s.startTime)}–{formatTime(s.endTime)}
                          </span>
                        ))}
                  </dd>
                </div>
              </dl>

              {!action && (batch.status === 'OPEN' || batch.status === 'ONGOING') && (
                <div className="flex flex-wrap gap-3">
                  {batch.status === 'OPEN' && (
                    <>
                      <button type="button" onClick={() => openAction('startDate')} className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950">
                        {batch.confirmed ? 'Change start date' : 'Confirm start date'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openAction('start')}
                        disabled={!canStart}
                        title={canStart ? undefined : `It can be started on or after ${formatDateOnly(batch.startDate)}.`}
                        className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mark as started
                      </button>
                    </>
                  )}
                  {batch.status === 'ONGOING' && (
                    <>
                      <button type="button" onClick={() => openAction('endDate')} className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950">
                        Change end date
                      </button>
                      <button type="button" onClick={() => openAction('close')} className="border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                        Close batch
                      </button>
                    </>
                  )}
                </div>
              )}
              {batch.status === 'OPEN' && !canStart && !action && (
                <p className="text-xs text-slate-500">Mark as started becomes available on {formatDateOnly(batch.startDate)}.</p>
              )}
              {(batch.status === 'CLOSED' || batch.status === 'CANCELLED') && (
                <p className="text-sm text-slate-500">This batch is {batch.status.toLowerCase()}. Its dates can no longer change.</p>
              )}

              {action && (
                <section className="space-y-4 border border-slate-200 p-4">
                  <h3 className="font-semibold text-slate-900">{ACTION_TITLES[action]}</h3>

                  {action === 'startDate' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs font-medium text-slate-600">Start date *</span>
                        <input type="date" value={startDate} onChange={(e) => changeStartDate(e.target.value)} className={inputClass} />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs font-medium text-slate-600">End date *</span>
                        <input
                          type="date"
                          value={endDate}
                          min={startDate}
                          onChange={(e) => {
                            setEndDate(e.target.value)
                            setEndEdited(true)
                          }}
                          className={inputClass}
                        />
                      </label>
                    </div>
                  )}
                  {action === 'endDate' && (
                    <label className="block text-sm">
                      <span className="mb-1 block text-xs font-medium text-slate-600">New end date *</span>
                      <input type="date" value={endDate} min={today} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
                    </label>
                  )}

                  {(action === 'startDate' || action === 'endDate') && startDate && endDate && (
                    <div className="bg-slate-50 p-3 text-sm text-slate-700">
                      <p>
                        <span className="text-slate-500">Now:</span> {formatDateOnly(batch.startDate)} to {formatDateOnly(batch.endDate)}
                      </p>
                      <p>
                        <span className="text-slate-500">After saving:</span>{' '}
                        <span className="font-semibold text-slate-900">
                          {formatDateOnly(action === 'startDate' ? startDate : batch.startDate)} to {formatDateOnly(endDate)}
                        </span>
                      </p>
                      {action === 'startDate' && startDate < today && (
                        <p className="mt-1 text-amber-700">This start date is in the past. That is allowed for a class that already began.</p>
                      )}
                    </div>
                  )}
                  {action === 'close' && batch.endDate > today && (
                    <p className="bg-slate-50 p-3 text-sm text-slate-700">
                      The end date ({formatDateOnly(batch.endDate)}) is still ahead, so it will be set to today. The trainees' enrollments are not changed.
                    </p>
                  )}

                  <ConflictList conflicts={conflicts} />

                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-slate-600">{action === 'close' ? 'Remark *' : 'Reason *'}</span>
                    <textarea
                      value={reason}
                      maxLength={SCHEDULE_REASON_MAX}
                      rows={3}
                      onChange={(e) => {
                        setReason(e.target.value)
                        setError(null)
                      }}
                      className={inputClass}
                    />
                  </label>

                  {(action === 'startDate' || action === 'endDate') && (
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4" />
                      Post an announcement to the trainees of this batch
                    </label>
                  )}

                  {error && (
                    <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setAction(null)} disabled={saving} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                      Cancel
                    </button>
                    <button type="button" onClick={() => void save()} disabled={saving} className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950 disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </section>
              )}

              <section>
                <h3 className="mb-3 font-semibold text-slate-900">History</h3>
                {batch.history.length === 0 ? (
                  <p className="text-sm text-slate-500">No changes yet. The dates are as planned.</p>
                ) : (
                  <ol className="space-y-4 border-l border-slate-200 pl-4">
                    {batch.history.map((entry) => (
                      <li key={entry.id} className="text-sm">
                        <p className="font-semibold text-slate-900">{SCHEDULE_CHANGE_LABELS[entry.changeType]}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(entry.changedAt).toLocaleString('en-PH')} · {entry.changedBy}
                        </p>
                        {(entry.oldStartDate !== entry.newStartDate || entry.oldEndDate !== entry.newEndDate) && (
                          <p className="mt-1 text-slate-700">
                            {formatDateOnly(entry.oldStartDate)} – {formatDateOnly(entry.oldEndDate)} →{' '}
                            {formatDateOnly(entry.newStartDate)} – {formatDateOnly(entry.newEndDate)}
                          </p>
                        )}
                        <p className="mt-1 whitespace-pre-wrap text-slate-600">{entry.reason}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
