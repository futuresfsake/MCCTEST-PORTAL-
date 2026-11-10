import { apiFetch } from '../auth.api'
import { ApiError } from './trainer-withdrawal.api'
import type {
  AdminFilterOptions,
  AdminSignoffInput,
  AdminStatusFilter,
  AdminWithdrawalDetail,
  AdminWithdrawalListResponse,
} from '../../types/withdrawal.type'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, init)
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
    throw new ApiError(message ?? 'Request failed', response.status)
  }
  return body as T
}

export interface AdminWithdrawalListParams {
  page?: number
  limit?: number
  status?: AdminStatusFilter
  search?: string
  programId?: string
  batchId?: string
}

// The admin is resolved from the session on the server. The admin sees every
// request, not only those of one batch.
export const adminWithdrawalApi = {
  list: (params: AdminWithdrawalListParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', params.status)
    if (params.search) query.set('search', params.search)
    if (params.programId) query.set('programId', params.programId)
    if (params.batchId) query.set('batchId', params.batchId)
    const qs = query.toString()
    return request<AdminWithdrawalListResponse>(`/admin/withdrawal-requests${qs ? `?${qs}` : ''}`)
  },

  filterOptions: () => request<AdminFilterOptions>('/admin/withdrawal-requests/filter-options'),

  get: (id: string) => request<AdminWithdrawalDetail>(`/admin/withdrawal-requests/${id}`),

  signOff: (id: string, input: AdminSignoffInput) =>
    request<AdminWithdrawalDetail>(`/admin/withdrawal-requests/${id}/sign-off`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
}
