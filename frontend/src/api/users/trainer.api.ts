import { apiFetch } from "../auth.api";

const configuredApiUrl = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const API_URL = configuredApiUrl.endsWith("/api")
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${API_URL}${path}`, init);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : body?.message;
    throw new Error(message ?? "Request failed");
  }
  return body as T;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type AttendanceEntry = {
  enrollmentId: string;
  traineeName: string;
  status: AttendanceStatus | null;
  remark: string;
  readOnly: boolean;
};
export type AttendanceDetail = {
  batch: {
    id: string;
    name: string;
    programName: string;
    programHours: number | null;
    startDate: string;
    endDate: string;
  };
  date: string;
  scheduled: boolean;
  suggestedHours: number;
  session: { id: string; hours: number; updatedAt: string } | null;
  entries: AttendanceEntry[];
  counts: Record<AttendanceStatus, number>;
};

export const trainerApi = {
  attendanceBatches: () =>
    request<
      Array<{
        id: string;
        name: string;
        programName: string;
        programHours: number | null;
        startDate: string;
        endDate: string;
      }>
    >("/trainer/attendance/batches"),
  attendanceSession: (batchId: string, date: string) =>
    request<AttendanceDetail>(
      `/trainer/attendance/batches/${batchId}/session?date=${encodeURIComponent(date)}`,
    ),
  attendanceSessions: (batchId: string) =>
    request<
      Array<{
        id: string;
        date: string;
        hours: number;
        scheduled: boolean;
        counts: Record<AttendanceStatus, number>;
      }>
    >(`/trainer/attendance/batches/${batchId}/sessions`),
  attendanceSummary: (batchId: string) =>
    request<{
      totalProgramHours: number | null;
      trainees: Array<{
        traineeName: string;
        hoursCompleted: number;
        percentage: number | null;
        counts: Record<AttendanceStatus, number>;
      }>;
    }>(`/trainer/attendance/batches/${batchId}/summary`),
  saveAttendance: (batchId: string, body: unknown) =>
    request<{ sessionId: string; updatedAt: string }>(
      `/trainer/attendance/batches/${batchId}/session`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  attendanceExportUrl: (batchId: string, from?: string, to?: string) =>
    `${API_URL}/trainer/attendance/batches/${batchId}/export${from || to ? `?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}` : ""}`,
  downloadAttendanceExport: async (
    batchId: string,
    from?: string,
    to?: string,
  ) => {
    const response = await apiFetch(
      trainerApi.attendanceExportUrl(batchId, from, to),
    );
    if (!response.ok) throw new Error("Unable to export attendance.");
    return response.blob();
  },
};
