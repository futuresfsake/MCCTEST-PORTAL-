import { apiFetch } from '../auth.api'
import type {
  CreateWithdrawalInput,
  WithdrawalDetail,
  WithdrawalListResponse,
  WithdrawalStatus,
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
    throw new Error(message ?? 'Request failed')
  }
  return body as T
}

export interface WithdrawalListParams {
  page?: number
  limit?: number
  status?: WithdrawalStatus | ''
}

// The trainee is resolved from the session on the server: no trainee id is ever sent.
export const traineeWithdrawalApi = {
  list: (params: WithdrawalListParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', params.status)
    const qs = query.toString()
    return request<WithdrawalListResponse>(`/trainee/withdrawal-requests${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<WithdrawalDetail>(`/trainee/withdrawal-requests/${id}`),

  create: (input: CreateWithdrawalInput) =>
    request<WithdrawalDetail>('/trainee/withdrawal-requests', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  cancel: (id: string) =>
    request<WithdrawalDetail>(`/trainee/withdrawal-requests/${id}/cancel`, { method: 'PATCH' }),
}
