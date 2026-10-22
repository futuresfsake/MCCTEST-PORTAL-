import { apiFetch } from '../auth.api'
import type { TraineeDashboardPayload } from '../../types/trainee-dashboard.type'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`

async function request<T>(path: string): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`)
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message
    throw new Error(message ?? 'Request failed')
  }
  return body as T
}

export const traineeApi = {
  // The trainee is resolved from the session on the server — no id is sent.
  dashboard: async () => {
    const payload = await request<TraineeDashboardPayload>('/trainee/dashboard')
    if (!Array.isArray(payload?.enrollments) || !Array.isArray(payload?.announcements)) {
      throw new Error('The dashboard response is in an unexpected format. Please refresh or contact support.')
    }
    return payload
  },
}
