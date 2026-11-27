// Mirrors the clearance request API (backend-nestjs/src/clearance).

export type ClearanceStatus =
  | 'PENDING_VALIDATION'
  | 'TRAINER_VALIDATED'
  | 'REGISTRAR_VALIDATED'
  | 'PROCESSED'
  | 'RELEASED'
  | 'REJECTED'
  | 'CANCELLED'

export type CertificateType = 'COC' | 'COT' | 'OTHER'

export interface ClearanceCertificate {
  type: CertificateType
  otherSpecify: string | null
}

/** The read-only part of the form, filled in by the system. */
export interface ClearanceFormInfo {
  enrollmentId: string
  enrollmentStatus: string
  programName: string
  batchName: string
  dateCompleted: string | null
  trainerName: string | null
  trainee: {
    name: string | null
    systemId: string | null
    contactNumber: string
    address: string
  }
}

export interface ClearanceFormOption extends ClearanceFormInfo {
  openRequestId: string | null
}

export interface ClearanceListItem {
  id: string
  controlNumber: string | null
  status: ClearanceStatus
  requestedAt: string
  certificates: ClearanceCertificate[]
  programName: string
  batchName: string
}

export interface ClearanceStage {
  by: string | null
  at: string | null
}

export interface ClearanceHistoryEntry {
  id: string
  oldStatus: ClearanceStatus | null
  newStatus: ClearanceStatus
  changedAt: string
  remarks: string | null
  changedBy: { name: string | null; role: string }
}

export interface ClearanceDetail {
  id: string
  controlNumber: string | null
  status: ClearanceStatus
  requestedAt: string
  purpose: string
  certified: boolean
  certifiedAt: string | null
  certificates: ClearanceCertificate[]
  form: ClearanceFormInfo
  clearanceStatus: 'NOT_CLEARED' | 'PENDING' | 'CLEARED' | null
  idSurrendered: boolean
  scheduleReleaseDate: string | null
  dateReleased: string | null
  stages: {
    trainer: ClearanceStage
    registrar: ClearanceStage
    encoder: ClearanceStage
    release: ClearanceStage
  }
  history: ClearanceHistoryEntry[]
}

export interface ClearanceListResponse {
  data: ClearanceListItem[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export interface CreateClearanceInput {
  enrollment_id: string
  certificates: CertificateType[]
  other_specify?: string
  purpose_of_request: string
  certified: boolean
}
