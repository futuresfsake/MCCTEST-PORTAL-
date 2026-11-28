/** Class Management: the trainer's batches and the changes to their dates. */

export type ClassStatus = 'OPEN' | 'ONGOING' | 'CLOSED' | 'CANCELLED';
export type ClassListStatus = Exclude<ClassStatus, 'CANCELLED'>;

export const CLASS_LIST_STATUSES: readonly ClassListStatus[] = ['OPEN', 'ONGOING', 'CLOSED'];

/** Every change needs a reason of this length (same limits as the API). */
export const SCHEDULE_REASON_MIN = 5;
export const SCHEDULE_REASON_MAX = 500;

export type ScheduleChangeType =
  | 'START_DATE_SET'
  | 'START_DATE_CHANGED'
  | 'END_DATE_CHANGED'
  | 'STARTED'
  | 'CLOSED'
  | 'DATES_EDITED_BY_STAFF';

export const SCHEDULE_CHANGE_LABELS: Record<ScheduleChangeType, string> = {
  START_DATE_SET: 'Start date confirmed',
  START_DATE_CHANGED: 'Start date changed',
  END_DATE_CHANGED: 'End date changed',
  STARTED: 'Classes started',
  CLOSED: 'Batch closed',
  DATES_EDITED_BY_STAFF: 'Planned dates edited by staff',
};

export interface ScheduleHistoryEntry {
  id: string;
  changeType: ScheduleChangeType;
  /** YYYY-MM-DD */
  oldStartDate: string;
  newStartDate: string;
  oldEndDate: string;
  newEndDate: string;
  oldStatus: ClassStatus;
  newStatus: ClassStatus;
  reason: string;
  /** ISO timestamp */
  changedAt: string;
  changedBy: string;
  changedByRole: string;
}

export interface ClassSummary {
  id: string;
  batchName: string;
  status: ClassStatus;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  confirmed: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
  enrolled: number;
  capacity: number;
  program: { id: string; name: string };
  schedules: { name: string; days: string[]; startTime: string; endTime: string }[];
}

export interface ClassDetail extends ClassSummary {
  history: ScheduleHistoryEntry[];
}

export interface ClassListResponse {
  data: ClassSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TraineeConflict {
  traineeId: string;
  name: string;
  systemId: string | null;
  reason: string;
}

/** The dates and status the trainer saw, so a changed batch is refused. */
export interface ExpectedBatch {
  expectedStartDate: string;
  expectedEndDate: string;
  expectedStatus: ClassStatus;
}

export interface ScheduleChangeInput extends ExpectedBatch {
  reason: string;
}

export interface SetStartDateInput extends ScheduleChangeInput {
  startDate: string;
  endDate?: string;
  notifyTrainees: boolean;
}

export interface SetEndDateInput extends ScheduleChangeInput {
  endDate: string;
  notifyTrainees: boolean;
}
