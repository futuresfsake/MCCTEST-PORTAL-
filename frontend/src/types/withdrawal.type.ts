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

/**
 * `''` = what is waiting for the trainer (the API default), `ALL` = every status,
 * `DECIDED` = what the trainer already approved or rejected (the log).
 */
export type TrainerStatusFilter = WithdrawalStatus | 'ALL' | 'DECIDED' | ''

export type TrainerAction = 'APPROVE' | 'REJECT'

export interface TrainerValidateInput {
  action: TrainerAction
  remarks?: string
}

// ---- Registrar side (backend-nestjs/src/users/registrar/withdrawal)

export interface RegistrarWithdrawalListItem {
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
    programId: string
    programName: string
  }
}

/** One official receipt of the enrollment. */
export interface RegistrarPayment {
  orNumber: string
  /** YYYY-MM-DD */
  paymentDate: string
  /** Decimal as text, for example "450.00". */
  amount: string
  method: 'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CHECK'
  reason: 'ENROLLMENT' | 'PROCESSING_FEE' | 'UNIFORM_ID_FEE' | 'ASSESSMENT_DEPOSIT' | 'EXTERNAL_FEES'
}

export interface RegistrarWithdrawalDetail extends RegistrarWithdrawalListItem {
  stages: WithdrawalDetail['stages']
  history: WithdrawalHistoryEntry[]
  /** What the trainer wrote when approving. */
  trainerRemarks: string | null
  /** The registrar's own two checks, as saved. The ID is confirmed by the admin. */
  checklist: {
    financesCleared: boolean
    documentsSubmitted: boolean
    remarks: string | null
  }
  /**
   * Whether the enrollment fee is paid (an ENROLLMENT receipt exists), and every payment of
   * the enrollment for the payment history pop-up. For information only.
   */
  enrollmentFee: {
    paid: boolean
    receipt: { orNumber: string; paymentDate: string; amount: string } | null
    /** Oldest first. */
    payments: RegistrarPayment[]
  }
  /** The trainee's document progress from the Requirements feature. For information only. */
  requirements: {
    submitted: number
    total: number
    missing: { key: string; label: string }[]
  }
}

export interface RegistrarWithdrawalListResponse {
  data: RegistrarWithdrawalListItem[]
  meta: WithdrawalListResponse['meta']
}

/** `''` = what is waiting for the registrar (the API default), `ALL` = every status. */
export type RegistrarStatusFilter = WithdrawalStatus | 'ALL' | ''

export type RegistrarAction = 'APPROVE' | 'REJECT'

export interface RegistrarValidateInput {
  action: RegistrarAction
  finances_cleared: boolean
  documents_submitted: boolean
  remarks?: string
}

export interface RegistrarFilterOptions {
  programs: { id: string; name: string }[]
  batches: { id: string; name: string; programId: string }[]
  statuses: WithdrawalStatus[]
}
