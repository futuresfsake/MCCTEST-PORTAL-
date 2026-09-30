// src/api/auth.api.ts

export function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  const session = localStorage.getItem('sessionToken');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(session ? { 'X-Session-Token': session } : {}),
  };
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: {
      ...authHeaders(),
      ...init.headers,
    },
  });
}
