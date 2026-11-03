import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  TraineeInformationRole,
  TraineeFilterOptions,
  TraineeListQuery,
  TraineeListResponse,
  TraineeProfile,
} from '../types/trainee-information.type';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function createClient(role: TraineeInformationRole): AxiosInstance {
  const client = axios.create({ baseURL: `${API_BASE_URL}/api/${role}/trainees` });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    const sessionToken = localStorage.getItem('sessionToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (sessionToken) config.headers['X-Session-Token'] = sessionToken;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/landing' && window.location.pathname !== '/') {
          window.location.assign('/landing');
        }
      }
      return Promise.reject(error);
    },
  );

  return client;
}

const clients: Record<TraineeInformationRole, AxiosInstance> = {
  admin: createClient('admin'),
  registrar: createClient('registrar'),
  trainer: createClient('trainer'),
  encoder: createClient('encoder'),
};

/** Only non-empty values are sent, so the URL and the request stay minimal. */
function toParams(query: TraineeListQuery): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== '' && value !== undefined),
  ) as Record<string, string | number>;
}

export async function listTrainees(
  role: TraineeInformationRole,
  query: TraineeListQuery,
  signal?: AbortSignal,
): Promise<TraineeListResponse> {
  const response = await clients[role].get<TraineeListResponse>('', { params: toParams(query), signal });
  return response.data;
}

export async function getTraineeFilterOptions(
  role: TraineeInformationRole,
  signal?: AbortSignal,
): Promise<TraineeFilterOptions> {
  const response = await clients[role].get<TraineeFilterOptions>('/filter-options', { signal });
  return response.data;
}

export async function getTraineeProfile(
  role: TraineeInformationRole,
  id: string,
  signal?: AbortSignal,
): Promise<TraineeProfile> {
  const response = await clients[role].get<TraineeProfile>(`/${encodeURIComponent(id)}`, { signal });
  return response.data;
}

/** True for requests cancelled by an AbortController (not real failures). */
export function isRequestCancelled(error: unknown): boolean {
  return axios.isCancel(error);
}

/** Server message for a failed request, or the fallback. */
export function requestErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (message) return message;
  }
  return fallback;
}
