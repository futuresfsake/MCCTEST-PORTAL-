import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { getTraineeProfile, isRequestCancelled, requestErrorMessage } from '../../api/trainee-information.api';
import EnrollmentStatusBadge from '../enrollment/EnrollmentStatusBadge';
import { BatchStatusBadge } from '../registrar/batches/BatchStatusBadge';
import type { TraineeInformationRole, TraineeProfile, TraineeProfileEnrollment } from '../../types/trainee-information.type';
import type { TraineeListLocationState } from './TraineeListView';
import { enumLabel, formatDateOnly, formatTime, formatTimestamp, fullName, valueOrDash } from './format';

const tagClass = 'text-[10px] font-semibold uppercase tracking-wider';

interface FieldProps {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
  mono?: boolean;
}

const Field: React.FC<FieldProps> = ({ label, value, wide, mono }) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className={`mt-0.5 text-sm text-slate-900 ${mono ? 'font-mono' : ''}`}>{value}</dd>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode }> = ({ title, children, aside }) => (
  <section className="rounded-lg border border-slate-200 bg-white p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      {aside}
    </div>
    {children}
  </section>
);

const EnrollmentCard: React.FC<{ enrollment: TraineeProfileEnrollment }> = ({ enrollment }) => {
  const { batch, program } = enrollment;
  const allSubmitted = enrollment.requirementsSubmitted === enrollment.requirementsTotal;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="font-semibold text-slate-900">{program.name}</h3>
        <span className={`${tagClass} text-slate-400`}>{program.isAccredited ? 'Accredited' : 'Non-accredited'}</span>
        <EnrollmentStatusBadge status={enrollment.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Batch</p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Batch" value={batch.name} />
            <Field label="Batch Status" value={<BatchStatusBadge status={batch.status} />} />
            <Field label="Start Date" value={formatDateOnly(batch.startDate)} />
            <Field label="End Date" value={formatDateOnly(batch.endDate)} />
            <Field label="Trainer" value={valueOrDash(batch.trainerName)} />
            <Field
              label="Schedule"
              wide
              value={
                program.schedules.length === 0 ? (
                  '—'
                ) : (
                  <ul className="space-y-0.5">
                    {program.schedules.map((schedule) => (
                      <li key={`${schedule.name}-${schedule.startTime}`}>
                        <span className="font-medium">{schedule.name}:</span>{' '}
                        {schedule.days.map(enumLabel).join(', ')} · {formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}
                      </li>
                    ))}
                  </ul>
                )
              }
            />
          </dl>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Enrollment</p>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="ID Card Number" value={valueOrDash(enrollment.idCardNumber)} mono />
            <Field label="OR Number" value={valueOrDash(enrollment.orNumber)} mono />
            <Field label="Uniform Size" value={valueOrDash(enrollment.uniformSize)} />
            <Field label="Enrolled Date" value={formatTimestamp(enrollment.enrolledAt)} />
            <Field
              label="Requirements"
              value={
                <span className={`${tagClass} ${allSubmitted ? 'text-green-700' : 'text-red-600'}`}>
                  {enrollment.requirementsSubmitted} / {enrollment.requirementsTotal} submitted
                </span>
              }
            />
            <Field
              label="Requirement Remarks"
              wide
              value={<span className="whitespace-pre-wrap">{valueOrDash(enrollment.requirementsRemarks)}</span>}
            />
          </dl>
        </div>
      </div>
    </article>
  );
};

interface TraineeProfileViewProps {
  role: TraineeInformationRole;
  traineeId: string;
  /** List route, e.g. /admin/trainees */
  basePath: string;
  /** Editing ships in MP-42; read-only while false. */
  canEdit: boolean;
}

/** Read-only trainee profile, loaded on its own (not from the list data). */
const TraineeProfileView: React.FC<TraineeProfileViewProps> = ({ role, traineeId, basePath, canEdit }) => {
  const location = useLocation();
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Back returns to the list exactly as it was (page, search, filters, sort)
  const listSearch = (location.state as TraineeListLocationState | null)?.listSearch ?? '';
  const backTo = `${basePath}${listSearch}`;

  // Opened from a scrolled list, the profile should still start at its top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [traineeId]);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    getTraineeProfile(role, traineeId, controller.signal)
      .then(setProfile)
      .catch((err: unknown) => {
        if (isRequestCancelled(err)) return;
        setError(requestErrorMessage(err, 'Failed to load the trainee profile.'));
      });
    return () => controller.abort();
  }, [role, traineeId, reloadKey]);

  const backLink = (
    <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-medium text-blue-900 transition hover:text-blue-700">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      Back to trainees
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-2 text-sm font-medium text-red-700 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!profile || profile.id !== traineeId) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-900" />
            <p className="text-sm text-slate-600">Loading trainee profile...</p>
          </div>
        </div>
      </div>
    );
  }

  const { address, beneficiary } = profile;
  // Trainers don't see insurance data.
  const showInsurance = role !== 'trainer';
  const hasActiveInsurance = profile.insurance.some((coverage) => coverage.isActive);

  return (
    <div className="space-y-6">
      {backLink}

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{fullName(profile)}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {valueOrDash(profile.username)}
              {profile.email && <> · {profile.email}</>}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              <span className={`${tagClass} text-slate-500`}>
                {profile.enrollments.length} {profile.enrollments.length === 1 ? 'program' : 'programs'}
              </span>
              {showInsurance && (
                <span className={`${tagClass} ${hasActiveInsurance ? 'text-green-700' : 'text-slate-400'}`}>
                  {hasActiveInsurance ? 'Insured' : 'No active insurance'}
                </span>
              )}
              {profile.pwd && <span className={`${tagClass} text-blue-800`}>PWD</span>}
            </div>
          </div>
          {canEdit && (
            <Link
              to={`${basePath}/${profile.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800"
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Personal Information">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact Number" value={valueOrDash(profile.contactNumber)} />
            <Field label="Gender" value={enumLabel(profile.gender)} />
            <Field label="Date of Birth" value={formatDateOnly(profile.dateOfBirth)} />
            <Field label="Place of Birth" value={valueOrDash(profile.placeOfBirth)} />
            <Field label="Civil Status" value={enumLabel(profile.civilStatus)} />
            <Field label="Citizenship" value={enumLabel(profile.citizenship)} />
            <Field label="Person with Disability" value={profile.pwd ? 'Yes' : 'No'} />
          </dl>
        </Section>

        <Section title="Address">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Street" value={valueOrDash(address.street)} wide />
            <Field label="Barangay" value={valueOrDash(address.barangay)} />
            <Field label="Municipality / City" value={valueOrDash(address.municipality)} />
            <Field label="District" value={valueOrDash(address.district)} />
            <Field label="Province" value={valueOrDash(address.province)} />
          </dl>
        </Section>

        <Section title="Family">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Mother's Name" value={valueOrDash(profile.family.motherName)} />
            <Field label="Father's Name" value={valueOrDash(profile.family.fatherName)} />
          </dl>
        </Section>

        <Section title="Education & Employment">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Highest Education" value={enumLabel(profile.education.highestEducation)} wide />
            <Field label="Employment Status" value={enumLabel(profile.employment.status)} />
            <Field label="Employment Type" value={enumLabel(profile.employment.type)} />
          </dl>
        </Section>

        <Section title="Beneficiary">
          {beneficiary ? (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" value={fullName(beneficiary)} />
              <Field label="Relationship" value={valueOrDash(beneficiary.relationship)} />
              <Field label="Contact Number" value={valueOrDash(beneficiary.contactNumber)} />
              <Field label="ID Number" value={valueOrDash(beneficiary.idNumber)} mono />
              <Field label="Address" value={valueOrDash(beneficiary.address)} wide />
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No beneficiary on record.</p>
          )}
        </Section>

        {showInsurance && (
          <Section title="Insurance Coverage">
            {profile.insurance.length === 0 ? (
              <p className="text-sm text-slate-500">No insurance coverage on record.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.insurance.map((coverage) => (
                  <li key={coverage.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span className="text-slate-900">
                      {formatDateOnly(coverage.effectiveDate)} – {formatDateOnly(coverage.expiryDate)}
                      <span className="ml-2 font-mono text-xs text-slate-500">{coverage.orNumber}</span>
                    </span>
                    <span className={`${tagClass} ${coverage.isActive ? 'text-green-700' : 'text-slate-400'}`}>
                      {coverage.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Enrollments ({profile.enrollments.length})</h2>
        {profile.enrollments.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-500">This trainee has no enrollments.</p>
        ) : (
          profile.enrollments.map((enrollment) => <EnrollmentCard key={enrollment.id} enrollment={enrollment} />)
        )}
      </section>
    </div>
  );
};

export default TraineeProfileView;
