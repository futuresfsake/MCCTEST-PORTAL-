import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
  ChangeBatchPayload,
  ChangeHistoryEntry,
  ChangeOptions,
  ChangeProgramPayload,
  ChangeResult,
  TraineeInformationRole,
  TraineeFilterOptions,
  TraineeListQuery,
  TraineeListResponse,
  TraineeProfile,
  UpdateTraineePayload,
} from '../types/trainee-information.type';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function createClient(path: string): AxiosInstance {
  const client = axios.create({ baseURL: `${API_BASE_URL}/api/${path}` });

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
  admin: createClient('admin/trainees'),
  registrar: createClient('registrar/trainees'),
  trainer: createClient('trainer/trainees'),
  encoder: createClient('encoder/trainees'),
};

/** Batch and program changes are admin only. */
const adminEnrollments = createClient('admin/enrollments');

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

/** Admin only. Saves the Edit Trainee form and returns the updated profile. */
export async function updateTrainee(id: string, payload: UpdateTraineePayload): Promise<TraineeProfile> {
  const response = await clients.admin.patch<TraineeProfile>(`/${encodeURIComponent(id)}`, payload);
  return response.data;
}

export async function getTraineeChangeHistory(
  role: TraineeInformationRole,
  id: string,
  signal?: AbortSignal,
): Promise<ChangeHistoryEntry[]> {
  const response = await clients[role].get<ChangeHistoryEntry[]>(`/${encodeURIComponent(id)}/change-history`, { signal });
  return response.data;
}

export async function getChangeOptions(enrollmentId: string, signal?: AbortSignal): Promise<ChangeOptions> {
  const response = await adminEnrollments.get<ChangeOptions>(`/${encodeURIComponent(enrollmentId)}/change-options`, { signal });
  return response.data;
}

export async function changeBatch(enrollmentId: string, payload: ChangeBatchPayload): Promise<ChangeResult> {
  const response = await adminEnrollments.post<ChangeResult>(`/${encodeURIComponent(enrollmentId)}/change-batch`, payload);
  return response.data;
}

export async function changeProgram(enrollmentId: string, payload: ChangeProgramPayload): Promise<ChangeResult> {
  const response = await adminEnrollments.post<ChangeResult>(`/${encodeURIComponent(enrollmentId)}/change-program`, payload);
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
