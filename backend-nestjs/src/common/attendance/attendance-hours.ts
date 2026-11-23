import { attendance_status_enum } from '../../generated/prisma/client';

/**
 * Attendance hours policy shared by trainer and trainee reporting:
 * PRESENT and LATE receive the full session hours; ABSENT and EXCUSED receive
 * zero hours until the project decides otherwise.
 */
export function attendanceCountsTowardHours(
  status: attendance_status_enum,
): boolean {
  return (
    status === attendance_status_enum.PRESENT ||
    status === attendance_status_enum.LATE
  );
}

export function completedAttendanceHours(
  rows: Array<{ status: attendance_status_enum; hours: number }>,
): number {
  return rows.reduce(
    (total, row) =>
      total + (attendanceCountsTowardHours(row.status) ? row.hours : 0),
    0,
  );
}
