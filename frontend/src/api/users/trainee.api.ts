import { apiFetch } from '../auth.api'
import type { TraineeDashboardPayload } from '../../types/trainee-dashboard.type'
import type { TraineeProfile, UpdateTraineeProfile } from '../../types/trainee-profile.type'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, init)
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
    if (!Array.isArray(payload?.enrollments)) {
      throw new Error('The dashboard response is in an unexpected format. Please refresh or contact support.')
    }
    return payload
  },
  profile: () => request<TraineeProfile>('/trainee/profile'),
  updateProfile: (data: UpdateTraineeProfile) =>
    request<TraineeProfile>('/trainee/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ message: string }>('/trainee/profile/password', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  uploadPhoto: async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(`${API_URL}/trainee/profile/photo`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}`,
        ...(localStorage.getItem('sessionToken')
          ? { 'X-Session-Token': localStorage.getItem('sessionToken')! }
          : {}),
      },
      body,
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message = Array.isArray(payload?.message)
        ? payload.message.join(', ')
        : payload?.message
      throw new Error(message ?? 'Photo upload failed')
    }
    return payload as { avatarUrl: string }
  },
}
