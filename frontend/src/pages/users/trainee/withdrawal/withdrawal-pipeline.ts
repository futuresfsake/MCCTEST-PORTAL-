import type { WithdrawalDetail, WithdrawalStatus } from '../../../../types/withdrawal.type'

// Turns a request's status + history into the four stages the trainee sees.
// Pure (no React) so the logic can be checked on its own.

export type StageKey = 'request' | 'trainer' | 'registrar' | 'admin'
export type StageState = 'done' | 'current' | 'rejected' | 'upcoming' | 'skipped'

export interface PipelineStage {
  key: StageKey
  label: string
  state: StageState
  /** Who acted, when known. */
  actor: string | null
  /** ISO date-time (or YYYY-MM-DD for the request itself) when the stage happened. */
  at: string | null
  /** Reason text: the trainee's reason for the request, or a validator's note on a rejection. */
  note: string | null
}

const VALIDATION_STAGES = ['trainer', 'registrar', 'admin'] as const
const LABELS: Record<StageKey, string> = {
  request: 'Request submitted',
  trainer: 'Trainer validation',
  registrar: 'Registrar validation',
  admin: 'Admin sign-off',
}

/** Which validation stage was waiting when a request moved on from `status`. */
const STAGE_AWAITING: Partial<Record<WithdrawalStatus, number>> = {
  PENDING_VALIDATION: 0,
  TRAINER_VALIDATED: 1,
  PENDING_ADMIN_SIGNOFF: 2,
}

export function buildPipeline(detail: WithdrawalDetail): PipelineStage[] {
  const { status, stages, history } = detail
  const first = history[0]

  const stageData = [stages.trainer, stages.registrar, stages.admin]
  // A rejection ends the pipeline at the stage that was awaiting action.
  const rejection = [...history].reverse().find((entry) => entry.newStatus === 'REJECTED') ?? null
  const rejectedAt = rejection ? (STAGE_AWAITING[rejection.oldStatus ?? 'PENDING_VALIDATION'] ?? 0) : null

  let current: number
  switch (status) {
    case 'APPROVED':
      current = VALIDATION_STAGES.length // every stage is done
      break
    case 'REJECTED':
    case 'CANCELLED':
      current = -1 // handled below
      break
    default:
      current = STAGE_AWAITING[status] ?? 0
  }

  const result: PipelineStage[] = [
    {
      key: 'request',
      label: LABELS.request,
      state: 'done',
      actor: first?.changedBy.name ?? null,
      at: first?.changedAt ?? detail.dateRequested,
      note: detail.reason,
    },
  ]

  VALIDATION_STAGES.forEach((key, index) => {
    let state: StageState
    if (status === 'CANCELLED') state = 'skipped'
    else if (status === 'REJECTED') {
      const at = rejectedAt ?? 0
      state = index < at ? 'done' : index === at ? 'rejected' : 'skipped'
    } else state = index < current ? 'done' : index === current ? 'current' : 'upcoming'

    const isRejectedStage = state === 'rejected' && rejection
    result.push({
      key,
      label: LABELS[key],
      state,
      actor: isRejectedStage ? (rejection.changedBy.name ?? null) : state === 'done' ? stageData[index].by : null,
      at: isRejectedStage ? rejection.changedAt : state === 'done' ? stageData[index].at : null,
      note: isRejectedStage ? rejection.remarks : null,
    })
  })

  return result
}

export const STATUS_LABELS: Record<WithdrawalStatus, string> = {
  PENDING_VALIDATION: 'Waiting for trainer',
  TRAINER_VALIDATED: 'Waiting for registrar',
  PENDING_ADMIN_SIGNOFF: 'Waiting for admin',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
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
