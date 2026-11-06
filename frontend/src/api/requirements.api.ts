import { apiFetch } from './auth.api';

/** The Requirements endpoints exist under both roles. */
export type RequirementsRole = 'admin' | 'registrar';

export type DocumentKey =
  | 'bc_nso_psa_copy'
  | 'diploma_tor'
  | 'brgy_clearance'
  | 'one_by_one_pic'
  | 'two_by_two_pic'
  | 'passport_size'
  | 'commitment_fee';

export type DocumentFlags = Record<DocumentKey, boolean>;

export interface RequirementRow {
  enrollmentId: string;
  traineeName: string;
  systemId: string | null;
  idCardNumber: string | null;
  program: { id: string; name: string };
  batch: { id: string; name: string; startDate: string };
  enrollmentStatus: string;
  documents: DocumentFlags;
  submitted: number;
  total: number;
  missing: DocumentKey[];
  checkedBy: string | null;
  checkedAt: string | null;
}

export interface RequirementListResponse {
  data: RequirementRow[];
  total: number;
  skip: number;
  take: number;
  counts: { complete: number; incomplete: number };
}

export interface ChecklistView {
  documents: DocumentFlags;
  submitted: number;
  total: number;
  missing: DocumentKey[];
  remarks: string | null;
  checkedBy: string | null;
  checkedAt: string | null;
}

export interface HistoryEntry {
  id: string;
  document: DocumentKey;
  oldValue: boolean;
  newValue: boolean;
  changedBy: string | null;
  changedAt: string;
  remarks: string | null;
}

export interface RequirementDetail {
  enrollmentId: string;
  traineeName: string;
  idCardNumber: string | null;
  program: string;
  batch: string;
  enrollmentStatus: string;
  checklist: ChecklistView;
  history: { data: HistoryEntry[]; nextCursor: string | null };
}

export interface RequirementFilterOptions {
  programs: { id: string; name: string }[];
  batches: { id: string; name: string; programId: string }[];
  statuses: string[];
  documents: { key: DocumentKey; label: string }[];
}

/** The commitment fee is a payment, so it is not part of what the checklist saves. */
export interface UpdateRequirementPayload {
  bcNsoPsaCopy: boolean;
  diplomaTor: boolean;
  brgyClearance: boolean;
  oneByOnePic: boolean;
  twoByTwoPic: boolean;
  passportSize: boolean;
  remarks?: string;
  expectedCheckedAt: string | null;
}

/** Same cap as the backend; longer selections are sent in chunks. */
export const BULK_CHUNK_SIZE = 100;

/** Thrown when the checklist was saved by someone else first (HTTP 409). */
export class StaleChecklistError extends Error {}

async function parse<T>(response: Response, fallback: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(data?.message)
      ? data.message.join(', ')
      : (data?.message ?? fallback);
    if (response.status === 409) throw new StaleChecklistError(message);
    throw new Error(message);
  }
  return data as T;
}

export async function getRequirements(role: RequirementsRole, params: URLSearchParams, signal?: AbortSignal) {
  const response = await apiFetch(`/api/${role}/requirements?${params.toString()}`, { signal });
  return parse<RequirementListResponse>(response, 'Failed to load requirements');
}

export async function getRequirementFilterOptions(role: RequirementsRole) {
  const response = await apiFetch(`/api/${role}/requirements/filter-options`);
  return parse<RequirementFilterOptions>(response, 'Failed to load filters');
}

export async function getRequirementDetail(role: RequirementsRole, enrollmentId: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const response = await apiFetch(`/api/${role}/requirements/${enrollmentId}${query}`);
  return parse<RequirementDetail>(response, 'Failed to load checklist');
}

export async function updateRequirement(role: RequirementsRole, enrollmentId: string, payload: UpdateRequirementPayload) {
  const response = await apiFetch(`/api/${role}/requirements/${enrollmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
  return parse<ChecklistView>(response, 'Failed to save checklist');
}

export async function bulkMarkReceived(role: RequirementsRole, enrollmentIds: string[], document: DocumentKey) {
  const response = await apiFetch(`/api/${role}/requirements/bulk`, {
    method: 'POST',
    body: JSON.stringify({ enrollmentIds, document }),
    headers: { 'Content-Type': 'application/json' },
  });
  return parse<{ requested: number; updated: number; unchanged: number }>(
    response,
    'Failed to update the selected rows',
  );
}
