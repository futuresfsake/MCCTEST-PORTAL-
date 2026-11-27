import type {
  CertificateType,
  ClearanceCertificate,
  ClearanceDetail,
  ClearanceStatus,
} from '../../types/clearance.type'

export const STATUS_LABELS: Record<ClearanceStatus, string> = {
  PENDING_VALIDATION: 'Waiting for the Trainer',
  TRAINER_VALIDATED: 'Waiting for the Registrar',
  REGISTRAR_VALIDATED: 'Waiting for the Encoder',
  PROCESSED: 'Waiting for release',
  RELEASED: 'Released',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
}

export const OPEN_STATUSES: ClearanceStatus[] = [
  'PENDING_VALIDATION',
  'TRAINER_VALIDATED',
  'REGISTRAR_VALIDATED',
  'PROCESSED',
]

export const CERTIFICATE_LABELS: Record<CertificateType, string> = {
  COC: 'Certificate of Completion',
  COT: 'Certificate of Training',
  OTHER: 'Other',
}

export function certificateText(certificate: ClearanceCertificate): string {
  const label = CERTIFICATE_LABELS[certificate.type]
  return certificate.otherSpecify ? `${label}: ${certificate.otherSpecify}` : label
}

export type StageState = 'done' | 'current' | 'rejected' | 'upcoming' | 'skipped'

export interface Stage {
  label: string
  state: StageState
  actor: string | null
  at: string | null
  /** A rejection reason. */
  note: string | null
}

/** The step each open status is waiting on: 1 Trainer, 2 Registrar, 3 Encoder, 4 Release. */
const WAITING_AT: Partial<Record<ClearanceStatus, number>> = {
  PENDING_VALIDATION: 1,
  TRAINER_VALIDATED: 2,
  REGISTRAR_VALIDATED: 3,
  PROCESSED: 4,
}

/** Request, Trainer, Registrar, Encoder, Release: where the request stands. */
export function buildStages(detail: ClearanceDetail): Stage[] {
  const { status, stages, history } = detail
  const rejection = [...history].reverse().find((entry) => entry.newStatus === 'REJECTED') ?? null
  const rejectedAt = WAITING_AT[rejection?.oldStatus ?? 'PENDING_VALIDATION'] ?? 1
  // History has the exact time; the release stage only stores a date.
  const released = history.find((entry) => entry.newStatus === 'RELEASED')

  const steps = [
    { label: 'Request', by: history[0]?.changedBy.name ?? null, at: detail.requestedAt },
    { label: 'Trainer', ...stages.trainer },
    { label: 'Registrar', ...stages.registrar },
    { label: 'Encoder', ...stages.encoder },
    { label: 'Release', by: stages.release.by, at: released?.changedAt ?? stages.release.at },
  ]

  return steps.map((step, index) => {
    let state: StageState
    if (index === 0 || status === 'RELEASED') state = 'done'
    else if (status === 'CANCELLED') state = 'skipped'
    else if (status === 'REJECTED') {
      state = index < rejectedAt ? 'done' : index === rejectedAt ? 'rejected' : 'skipped'
    } else {
      const waiting = WAITING_AT[status] ?? 1
      state = index < waiting ? 'done' : index === waiting ? 'current' : 'upcoming'
    }

    const isRejected = state === 'rejected' && rejection
    return {
      label: step.label,
      state,
      actor: isRejected ? rejection.changedBy.name : state === 'done' ? step.by : null,
      at: isRejected ? rejection.changedAt : state === 'done' ? step.at : null,
      note: isRejected ? rejection.remarks : null,
    }
  })
}

export function formatDate(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
