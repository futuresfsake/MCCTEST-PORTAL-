import { apiFetch } from './auth.api'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = configuredApiUrl.replace(/\/$/, '').endsWith('/api')
  ? configuredApiUrl.replace(/\/$/, '')
  : `${configuredApiUrl.replace(/\/$/, '')}/api`

export type AnnouncementScope = 'GLOBAL' | 'PROGRAM' | 'BATCH'

export type Announcement = {
  id: string
  scope: AnnouncementScope
  content: string
  remarks: string | null
  posted_at: string
  posted_by: string
  users?: {
    first_name?: string
    last_name?: string
    system_id?: string
    role?: string
    avatar_url?: string | null
  }
  programs?: { id: string; name: string; program_code: string }
  batch?: { id: string; batch_name: string; programs?: { name: string } }
}

export type AnnouncementInput = {
  scope: AnnouncementScope
  content: string
  program_id?: string
  batch_id?: string
  remarks?: string
}

export type AnnouncementListResponse = {
  data: Announcement[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type AnnouncementOptions = {
  programs: { id: string; name: string; program_code: string }[]
  batches: {
    id: string
    batch_name: string
    programs?: { name: string }
  }[]
}

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

export const announcementsApi = {
  list: (params = '') =>
    request<AnnouncementListResponse>(`/announcements${params}`),
  options: () => request<AnnouncementOptions>('/announcements/options'),
  create: (input: AnnouncementInput) =>
    request<Announcement>('/announcements', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Pick<AnnouncementInput, 'content' | 'remarks'>) =>
    request<Announcement>(`/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  remove: (id: string) =>
    request<{ message: string }>(`/announcements/${id}`, { method: 'DELETE' }),
  active: () => request<Announcement[]>('/announcements/active'),
}
