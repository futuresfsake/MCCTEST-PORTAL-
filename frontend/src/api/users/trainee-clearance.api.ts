import { apiFetch } from '../auth.api'
import type {
  ClearanceDetail,
  ClearanceFormOption,
  ClearanceListResponse,
  ClearanceStatus,
  CreateClearanceInput,
} from '../../types/clearance.type'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`
const BASE = '/trainee/clearance-requests'

export class ClearanceApiError extends Error {
  readonly status: number

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
    throw new ClearanceApiError(message ?? 'Request failed', response.status)
  }
  return body as T
}

export interface ClearanceListParams {
  page?: number
  limit?: number
  status?: ClearanceStatus | ''
}

// The trainee is resolved from the session on the server: no trainee id is ever sent.
export const traineeClearanceApi = {
  list: (params: ClearanceListParams = {}) => {
    const query = new URLSearchParams()
    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', params.status)
    const qs = query.toString()
    return request<ClearanceListResponse>(`${BASE}${qs ? `?${qs}` : ''}`)
  },

  formOptions: () => request<{ enrollments: ClearanceFormOption[] }>(`${BASE}/form-options`),

  get: (id: string) => request<ClearanceDetail>(`${BASE}/${encodeURIComponent(id)}`),

  create: (input: CreateClearanceInput) =>
    request<ClearanceDetail>(BASE, { method: 'POST', body: JSON.stringify(input) }),

  cancel: (id: string) =>
    request<ClearanceDetail>(`${BASE}/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' }),
}
