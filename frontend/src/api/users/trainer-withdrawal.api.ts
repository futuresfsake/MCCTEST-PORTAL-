import { apiFetch } from '../auth.api'
import type {
  TrainerStatusFilter,
  TrainerValidateInput,
  TrainerWithdrawalDetail,
  TrainerWithdrawalListResponse,
} from '../../types/withdrawal.type'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`

/** An API error that keeps the HTTP status, so screens do not have to match on message text. */
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, init)
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
    throw new ApiError(message ?? 'Request failed', response.status)
  }
  return body as T
}

export interface TrainerWithdrawalListParams {
  page?: number
  limit?: number
  status?: TrainerStatusFilter
  search?: string
  batchId?: string
}

// The trainer is resolved from the session on the server. The API only returns
// requests from the trainer's own batches.
export const trainerWithdrawalApi = {
  list: (params: TrainerWithdrawalListParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.batchId) query.set('batchId', params.batchId)
    const qs = query.toString()
    return request<TrainerWithdrawalListResponse>(`/trainer/withdrawal-requests${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<TrainerWithdrawalDetail>(`/trainer/withdrawal-requests/${id}`),

  validate: (id: string, input: TrainerValidateInput) =>
    request<TrainerWithdrawalDetail>(`/trainer/withdrawal-requests/${id}/validate`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
}
