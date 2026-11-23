import type { EnrollmentRecord } from './enrollment.type'

export type UniformStatusFilter = 'ALL' | 'NOT_GIVEN' | 'GIVEN'

export type UniformSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'

export interface UniformDistributionItem {
  enrollmentId: string
  traineeId: string
  traineeName: string
  systemId: string | null
  idCardNumber: string | null
  programId: string
  programName: string
  batchId: string
  batchName: string
  enrollmentSize: UniformSize | null
  enrollmentStatus: EnrollmentRecord['enrollmentStatus']
  uniformGiven: boolean
  sizeIssued: UniformSize | null
  dateDistributed: string | null
  distributedBy: string | null
  inventoryId: string | null
  isInactive: boolean
}

export interface UniformDistributionListParams {
  page?: number
  limit?: number
  status?: UniformStatusFilter
  programId?: string
  batchId?: string
  search?: string
  includeInactive?: boolean
}

export interface UniformDistributionListResponse {
  data: UniformDistributionItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  counts: {
    given: number
    waiting: number
  }
}

export interface DistributeUniformPayload {
  size: UniformSize
}

export interface DistributeUniformResponse {
  message: string
  enrollmentId: string
  uniformGiven: boolean
  sizeIssued: UniformSize
  dateDistributed: string | null
  inventoryId: string | null
}
