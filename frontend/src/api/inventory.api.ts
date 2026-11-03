
import { apiFetch } from './auth.api'

export type InventoryStockLevel =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'

export type InventoryStockFilter = 'all' | 'in_stock' | 'low' | 'out'

export type InventorySortBy =
  | 'program'
  | 'item'
  | 'size'
  | 'quantity'

export type InventorySortOrder = 'asc' | 'desc'

export interface InventoryListQuery {
  page?: number
  limit?: number
  search?: string
  programId?: string
  size?: string
  stockLevel?: InventoryStockFilter
  sortBy?: InventorySortBy
  sortOrder?: InventorySortOrder
}

export interface InventoryItem {
  id: string
  program_id: string
  item_name: string
  sizes: string
  quantity: number
  updated_at: string
  last_restocked_at: string | null
  stock_level: InventoryStockLevel
  programs?: {
    id: string
    name: string
  } | null
  users?: {
    id: string
    first_name: string
    last_name: string
  } | null
}

export interface InventoryListResponse {
  data: InventoryItem[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface InventorySummary {
  program_id: string
  program_name: string
  total_units: number
  total_items: number
  low_stock_items: number
  out_of_stock_items: number
  /** Quantity and stock level for each size the program has a row for. */
  sizes: Partial<Record<string, { quantity: number; level: InventoryStockLevel }>>
}

export interface InventoryAvailability {
  program_id: string
  size: string
  available_quantity: number
}

export interface CreateInventoryPayload {
  program_id: string
  sizes: string
  quantity: number
}

export interface RestockInventoryPayload {
  quantity: number
  remarks?: string
}

export interface AdjustInventoryPayload {
  quantity_change: number
  reason: string
}

export interface InventoryMutationResponse {
  id: string
  quantity: number
  stock_level: InventoryStockLevel
}

export type InventoryHistoryType =
  | 'INITIAL'
  | 'RESTOCK'
  | 'DISTRIBUTED'
  | 'ADJUSTMENT'

export interface InventoryHistoryEntry {
  id: string
  type: InventoryHistoryType
  quantity_change: number
  quantity_after: number
  enrollment_id: string | null
  remarks: string | null
  created_at: string
  /** The staff member who made the change. */
  users: {
    id: string
    first_name: string
    last_name: string
    role: string
  } | null
  /** For a distribution: the enrollment, and through it the trainee who received the uniform. */
  enrollments: {
    id_card_number: string | null
    trainee: {
      users: {
        first_name: string
        last_name: string
      } | null
    } | null
  } | null
  inventory: {
    id: string
    item_name: string
    sizes: string
    programs: {
      id: string
      name: string
    } | null
  } | null
}

export interface InventoryProgramHistoryQuery {
  programId?: string
  type?: InventoryHistoryType
  /** Inclusive start, ISO date-time. */
  from?: string
  /** Exclusive end, ISO date-time. */
  to?: string
  cursor?: string
}

export interface InventoryHistoryResponse {
  data: InventoryHistoryEntry[]
  nextCursor: string | null
  hasMore: boolean
}

async function inventoryRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await apiFetch(path, init)
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    const message = result?.message

    throw new Error(
      Array.isArray(message)
        ? message.join(', ')
        : message ?? result?.error ?? 'Inventory request failed.',
    )
  }

  return result as T
}

export async function getInventory(
  query: InventoryListQuery = {},
  signal?: AbortSignal,
): Promise<InventoryListResponse> {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      value === 'all'
    ) {
      return
    }

    params.set(key, String(value))
  })

  const search = params.toString()

  return inventoryRequest<InventoryListResponse>(
    `/api/inventory${search ? `?${search}` : ''}`,
    { signal },
  )
}

export async function getInventorySummary(
  signal?: AbortSignal,
): Promise<InventorySummary[]> {
  return inventoryRequest<InventorySummary[]>(
    '/api/inventory/summary',
    { signal },
  )
}

export async function getUniformAvailability(
  programId: string,
  size: string,
  signal?: AbortSignal,
): Promise<InventoryAvailability> {
  const params = new URLSearchParams({ programId, size })

  return inventoryRequest<InventoryAvailability>(
    `/api/inventory/availability?${params.toString()}`,
    { signal },
  )
}

export async function createInventory(
  payload: CreateInventoryPayload,
): Promise<InventoryItem> {
  return inventoryRequest<InventoryItem>('/api/inventory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function restockInventory(
  id: string,
  payload: RestockInventoryPayload,
): Promise<InventoryMutationResponse> {
  return inventoryRequest<InventoryMutationResponse>(
    `/api/inventory/${id}/restock`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export async function adjustInventory(
  id: string,
  payload: AdjustInventoryPayload,
): Promise<InventoryMutationResponse> {
  return inventoryRequest<InventoryMutationResponse>(
    `/api/inventory/${id}/adjust`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  )
}

export async function getInventoryHistory(
  id: string,
  cursor?: string | null,
  signal?: AbortSignal,
): Promise<InventoryHistoryResponse> {
  const params = new URLSearchParams()

  if (cursor) {
    params.set('cursor', cursor)
  }

  const search = params.toString()

  return inventoryRequest<InventoryHistoryResponse>(
    `/api/inventory/${id}/history${search ? `?${search}` : ''}`,
    { signal },
  )
}

export async function getProgramInventoryHistory(
  query: InventoryProgramHistoryQuery = {},
  signal?: AbortSignal,
): Promise<InventoryHistoryResponse> {
  const params = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })

  const search = params.toString()

  return inventoryRequest<InventoryHistoryResponse>(
    `/api/inventory/history${search ? `?${search}` : ''}`,
    { signal },
  )
}
