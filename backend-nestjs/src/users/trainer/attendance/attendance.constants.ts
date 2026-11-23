import { attendance_status_enum } from '../../../generated/prisma/client';
import { attendanceCountsTowardHours } from '../../../common/attendance/attendance-hours';

export const ATTENDANCE_STATUSES = Object.values(attendance_status_enum);

export function isHoursCompleted(status: attendance_status_enum): boolean {
  return attendanceCountsTowardHours(status);
}
