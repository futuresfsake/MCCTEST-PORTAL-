import { apiFetch } from './auth.api'
import type {
  DistributeUniformPayload,
  DistributeUniformResponse,
  UniformDistributionListParams,
  UniformDistributionListResponse,
} from './../types/uniform-distribution.type'

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await apiFetch(`/api${path}`, init)
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message

    throw new Error(message ?? 'Uniform distribution request failed.')
  }

  return body as T
}

export const uniformDistributionApi = {
  list: (params: UniformDistributionListParams = {}) => {
    const query = new URLSearchParams()

    if (params.page) query.set('page', String(params.page))
    if (params.limit) query.set('limit', String(params.limit))
    if (params.status) query.set('status', params.status)
    if (params.programId) query.set('programId', params.programId)
    if (params.batchId) query.set('batchId', params.batchId)
    if (params.search) query.set('search', params.search)

    if (params.includeInactive !== undefined) {
      query.set('includeInactive', String(params.includeInactive))
    }

    const qs = query.toString()

    return request<UniformDistributionListResponse>(
      `/registrar/uniform-distribution${qs ? `?${qs}` : ''}`,
    )
  },

  distribute: (
    enrollmentId: string,
    payload: DistributeUniformPayload,
  ) =>
    request<DistributeUniformResponse>(
      `/registrar/uniform-distribution/${enrollmentId}/distribute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    ),
}