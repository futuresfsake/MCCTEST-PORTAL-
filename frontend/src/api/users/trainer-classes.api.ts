import { apiFetch } from '../auth.api'
import type {
  ClassDetail,
  ClassListResponse,
  ClassListStatus,
  ScheduleChangeInput,
  SetEndDateInput,
  SetStartDateInput,
  TraineeConflict,
} from '../../types/class-management.type'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`

/** An API error that keeps the status and, for a date conflict, the trainees. */
export class ClassApiError extends Error {
  status: number
  conflicts: TraineeConflict[]
  constructor(message: string, status: number, conflicts: TraineeConflict[] = []) {
    super(message)
    this.status = status
    this.conflicts = conflicts
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, { cache: 'no-store', ...init })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message
    throw new ClassApiError(message ?? 'Request failed', response.status, body?.conflicts ?? [])
  }
  return body as T
}

const post = <T>(path: string, input: object) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(input) })

// The trainer is resolved from the session on the server. The API only acts
// on the trainer's own batches.
export const trainerClassesApi = {
  list: (params: { status?: ClassListStatus | ''; page: number; limit: number }) => {
    const query = new URLSearchParams({ page: String(params.page), limit: String(params.limit) })
    if (params.status) query.set('status', params.status)
    return request<ClassListResponse>(`/trainer/classes?${query}`)
  },

  get: (batchId: string) => request<ClassDetail>(`/trainer/classes/${batchId}`),

  dateCheck: (batchId: string, startDate: string, endDate: string) =>
    request<{ conflicts: TraineeConflict[]; count: number }>(
      `/trainer/classes/${batchId}/date-check?${new URLSearchParams({ startDate, endDate })}`,
    ),

  setStartDate: (batchId: string, input: SetStartDateInput) =>
    post<ClassDetail>(`/trainer/classes/${batchId}/start-date`, input),

  start: (batchId: string, input: ScheduleChangeInput) =>
    post<ClassDetail>(`/trainer/classes/${batchId}/start`, input),

  setEndDate: (batchId: string, input: SetEndDateInput) =>
    post<ClassDetail>(`/trainer/classes/${batchId}/end-date`, input),

  close: (batchId: string, input: ScheduleChangeInput) =>
    post<ClassDetail>(`/trainer/classes/${batchId}/close`, input),
}
