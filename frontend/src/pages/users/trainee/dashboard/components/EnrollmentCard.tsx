import type { ReactNode } from 'react'
import type { DashboardEnrollment } from '../../../../../types/trainee-dashboard.type'
import { enumLabel, formatDateOnly, formatTime } from '../../../../../components/trainee-information/format'
import { BatchStatusChip, EnrollmentStatusChip } from './DashboardChips'
import { DashboardSection, EmptyState } from './DashboardSection'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{children}</dd>
    </div>
  )
}

export default function EnrollmentCard({ enrollment }: { enrollment: DashboardEnrollment | null }) {
  if (!enrollment) {
    return (
      <DashboardSection eyebrow="Enrollment" title="My Enrollment">
        <EmptyState
          icon="fa-solid fa-file-signature"
          title="You are not enrolled in a batch yet"
          message="Once the registrar enrolls you in a program batch, your program, batch, schedule, and trainer will appear here."
        />
      </DashboardSection>
    )
  }

  const { program, batch, trainer } = enrollment

  return (
    <DashboardSection
      eyebrow="Enrollment"
      title="My Enrollment"
      aside={<EnrollmentStatusChip status={enrollment.enrollmentStatus} />}
    >
      <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Program">
          {program.name}
          <span className="ml-2 text-xs font-normal text-slate-400">{program.programCode}</span>
        </Field>
        <Field label="Batch">{batch.batchName}</Field>
        <Field label="Batch status">
          <BatchStatusChip status={batch.batchStatus} />
        </Field>
        <Field label="Start date">{formatDateOnly(batch.startDate)}</Field>
        <Field label="End date">{formatDateOnly(batch.endDate)}</Field>
        <Field label="Trainer">{trainer?.name || '—'}</Field>
        <Field label="ID card number">
          {enrollment.idCardNumber ? (
            <span className="font-mono">{enrollment.idCardNumber}</span>
          ) : (
            <span className="text-slate-400">Not yet generated</span>
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Schedule">
            {program.schedules.length === 0 ? (
              <span className="text-slate-400">No schedule set</span>
            ) : (
              <ul className="space-y-1">
                {program.schedules.map((schedule) => (
                  <li key={`${schedule.scheduleName}-${schedule.startTime}`}>
                    <span className="text-slate-500">{schedule.scheduleName}:</span>{' '}
                    {schedule.days.map(enumLabel).join(', ') || '—'} ·{' '}
                    {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
                  </li>
                ))}
              </ul>
            )}
          </Field>
        </div>
      </dl>
    </DashboardSection>
  )
}
