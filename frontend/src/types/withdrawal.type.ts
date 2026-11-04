// Mirrors the trainee withdrawal API (backend-nestjs/src/withdrawal).

export type WithdrawalStatus =
  | 'PENDING_VALIDATION'
  | 'TRAINER_VALIDATED'
  | 'PENDING_ADMIN_SIGNOFF'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

/** Statuses where the request is still moving through the pipeline. */
export const OPEN_WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  'PENDING_VALIDATION',
  'TRAINER_VALIDATED',
  'PENDING_ADMIN_SIGNOFF',
]

export interface WithdrawalListItem {
  id: string
  status: WithdrawalStatus
  reason: string
  /** YYYY-MM-DD */
  dateRequested: string
  enrollment: {
    id: string
    status: string
    batchName: string
    programName: string
  }
}

export interface WithdrawalHistoryEntry {
  id: string
  oldStatus: WithdrawalStatus | null
  newStatus: WithdrawalStatus
  changedAt: string
  remarks: string | null
  changedBy: { name: string | null; role: string }
}

export interface WithdrawalDetail extends WithdrawalListItem {
  stages: {
    trainer: { validated: boolean; by: string | null; at: string | null }
    registrar: { by: string | null; at: string | null }
    admin: { by: string | null; at: string | null }
  }
  history: WithdrawalHistoryEntry[]
}

export interface WithdrawalListResponse {
  data: WithdrawalListItem[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateWithdrawalInput {
  enrollment_id: string
  requested_reason: string
}

// ---- Trainer side (backend-nestjs/src/users/trainer/withdrawal)

export interface TrainerWithdrawalListItem {
  id: string
  status: WithdrawalStatus
  reason: string
  /** YYYY-MM-DD */
  dateRequested: string
  trainee: { name: string | null; systemId: string | null }
  enrollment: {
    id: string
    status: string
    batchId: string
    batchName: string
    programName: string
  }
}

export interface TrainerWithdrawalDetail extends TrainerWithdrawalListItem {
  stages: WithdrawalDetail['stages']
  history: WithdrawalHistoryEntry[]
}

export interface TrainerWithdrawalListResponse {
  data: TrainerWithdrawalListItem[]
  meta: WithdrawalListResponse['meta']
}

/** `''` = what is waiting for the trainer (the API default), `ALL` = every status. */
export type TrainerStatusFilter = WithdrawalStatus | 'ALL' | ''

export type TrainerAction = 'APPROVE' | 'REJECT'

export interface TrainerValidateInput {
  action: TrainerAction
  remarks?: string
}
