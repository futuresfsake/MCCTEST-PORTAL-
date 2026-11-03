import React from 'react';
import { BATCH_STATUSES, ENROLLMENT_STATUSES, GENDERS } from '../../types/trainee-information.type';
import type { TraineeFilterOptions, TraineeFilters } from '../../types/trainee-information.type';
import { enumLabel } from './format';

export const PROGRAM_TYPE_LABELS = { ACCREDITED: 'Accredited', NON_ACCREDITED: 'Non-accredited' } as const;
export const INSURANCE_LABELS = { ACTIVE: 'Active coverage', NONE: 'No active coverage' } as const;
export const REQUIREMENT_LABELS = { COMPLETE: 'Complete', INCOMPLETE: 'Incomplete' } as const;

const fieldClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500';

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({ id, label, value, onChange, allLabel, options, disabled }) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={fieldClass}>
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

interface TraineeFilterPanelProps {
  filters: TraineeFilters;
  options: TraineeFilterOptions | null;
  onChange: (patch: Partial<TraineeFilters>) => void;
  /** Insurance is hidden for roles that don't see insurance data (trainer). */
  showInsurance?: boolean;
}

/** Every list filter except search. Batch choices are scoped to the selected program. */
const TraineeFilterPanel: React.FC<TraineeFilterPanelProps> = ({ filters, options, onChange, showInsurance = true }) => {
  const programBatches = (options?.batches ?? []).filter((batch) => batch.programId === filters.programId);
  const toOptions = (values: readonly string[]) => values.map((value) => ({ value, label: enumLabel(value) }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <SelectField
        id="filter-program"
        label="Program"
        value={filters.programId}
        // A batch belongs to one program, so changing the program clears it
        onChange={(programId) => onChange({ programId, batchId: '' })}
        allLabel="All programs"
        options={(options?.programs ?? []).map((program) => ({ value: program.id, label: program.name }))}
        disabled={!options}
      />
      <SelectField
        id="filter-batch"
        label="Batch"
        value={filters.batchId}
        onChange={(batchId) => onChange({ batchId })}
        allLabel={filters.programId ? 'All batches' : 'Select a program first'}
        options={programBatches.map((batch) => ({ value: batch.id, label: `${batch.name} (${enumLabel(batch.status)})` }))}
        disabled={!filters.programId}
      />
      <SelectField
        id="filter-enrollment-status"
        label="Enrollment Status"
        value={filters.enrollmentStatus}
        onChange={(value) => onChange({ enrollmentStatus: value as TraineeFilters['enrollmentStatus'] })}
        allLabel="All statuses"
        options={toOptions(options?.enrollmentStatuses ?? ENROLLMENT_STATUSES)}
      />
      <SelectField
        id="filter-batch-status"
        label="Batch Status"
        value={filters.batchStatus}
        onChange={(value) => onChange({ batchStatus: value as TraineeFilters['batchStatus'] })}
        allLabel="All batch statuses"
        options={toOptions(options?.batchStatuses ?? BATCH_STATUSES)}
      />
      <div>
        <label htmlFor="filter-date-from" className={labelClass}>
          Enrolled From
        </label>
        <input
          id="filter-date-from"
          type="date"
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          onChange={(event) => onChange({ dateFrom: event.target.value })}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="filter-date-to" className={labelClass}>
          Enrolled To
        </label>
        <input
          id="filter-date-to"
          type="date"
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          onChange={(event) => onChange({ dateTo: event.target.value })}
          className={fieldClass}
        />
      </div>
      <SelectField
        id="filter-program-type"
        label="Program Type"
        value={filters.programType}
        onChange={(value) => onChange({ programType: value as TraineeFilters['programType'] })}
        allLabel="All program types"
        options={Object.entries(PROGRAM_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
      />
      <SelectField
        id="filter-gender"
        label="Gender"
        value={filters.gender}
        onChange={(value) => onChange({ gender: value as TraineeFilters['gender'] })}
        allLabel="All genders"
        options={toOptions(options?.genders ?? GENDERS)}
      />
      {showInsurance && (
        <SelectField
          id="filter-insurance"
          label="Insurance"
          value={filters.insurance}
          onChange={(value) => onChange({ insurance: value as TraineeFilters['insurance'] })}
          allLabel="Any insurance"
          options={Object.entries(INSURANCE_LABELS).map(([value, label]) => ({ value, label }))}
        />
      )}
      <SelectField
        id="filter-requirements"
        label="Requirements"
        value={filters.requirements}
        onChange={(value) => onChange({ requirements: value as TraineeFilters['requirements'] })}
        allLabel="Any requirements"
        options={Object.entries(REQUIREMENT_LABELS).map(([value, label]) => ({ value, label }))}
      />
    </div>
  );
};

export default TraineeFilterPanel;
