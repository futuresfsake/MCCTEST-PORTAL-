// src/api/users/admin.api.ts

import { authHeaders } from '../auth.api';


const BASE = '/api/admin/staff-accounts';

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  console.log('HTTP status:', res.status);
  console.log('HTTP URL:', res.url);
  console.log('HTTP content-type:', res.headers.get('content-type'));
  console.log('RAW RESPONSE:', text);

  let json: unknown;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    throw new Error('Server returned invalid JSON');
  }

  if (!res.ok) {
    const body = json as { message?: string | string[] };

    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message ?? 'Something went wrong';

    throw new Error(message);
  }

  return json as T;
}


// ── Types ────────────────────────────────────────────────────────────────────

export type StaffRole = 'REGISTRAR' | 'TRAINER' | 'ENCODER';

export interface StaffMember {
  id: string;
  system_id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  avatar_url: string | null;
  // TODO: add employee_id here once the field is confirmed in the schema
}

export interface CreateStaffPayload {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  role: StaffRole;
  password: string;
}

export interface UpdateStaffPayload {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email?: string;
}

export interface StaffListFilters {
  role?: StaffRole;
  isActive?: boolean;
}

// ── API calls ────────────────────────────────────────────────────────────────

export const adminApi = {
  listStaff: async (filters: StaffListFilters = {}): Promise<StaffMember[]> => {
    const params = new URLSearchParams();

    if (filters.role) {
      params.set('role', filters.role);
    }

    if (filters.isActive !== undefined) {
      params.set('isActive', String(filters.isActive));
    }

    const query = params.toString() ? `?${params}` : '';

    const res = await fetch(`${BASE}${query}`, {
      headers: authHeaders(),
    });

    const data = await handleResponse<unknown>(res);

    console.log('listStaff API response:', data);
    console.log('response is array:', Array.isArray(data));

    if (!Array.isArray(data)) {
      console.error('EXPECTED ARRAY, GOT:', data);
      throw new Error('Invalid staff API response: expected an array');
    }

    return data as StaffMember[];
  },

  createStaff: async (payload: CreateStaffPayload): Promise<StaffMember & { email: string }> => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  updateStaff: async (id: string, payload: UpdateStaffPayload): Promise<StaffMember> => {
    const res = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  setStatus: async (id: string, isActive: boolean): Promise<StaffMember & { message: string }> => {
    const res = await fetch(`${BASE}/${id}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ isActive }),
    });
    return handleResponse(res);
  },

  resetPassword: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${BASE}/${id}/reset-password`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },
};
