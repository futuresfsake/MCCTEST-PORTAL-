import React, { useState } from 'react';
import { requestErrorMessage, updateTrainee } from '../../api/trainee-information.api';
import {
  CIVIL_STATUSES,
  EMPLOYMENT_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  HIGHEST_EDUCATIONS,
} from '../../types/trainee-information.type';
import type { TraineeProfile, UpdateTraineePayload } from '../../types/trainee-information.type';
import { enumLabel, fullName, valueOrDash } from './format';
import ProfileModal, { FormField, inputClass, primaryButtonClass, secondaryButtonClass } from './ProfileModal';

function toForm(profile: TraineeProfile): UpdateTraineePayload {
  return {
    firstName: profile.firstName,
    middleName: profile.middleName,
    lastName: profile.lastName,
    email: profile.email ?? '',
    contactNumber: profile.contactNumber,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth,
    placeOfBirth: profile.placeOfBirth,
    citizenship: profile.citizenship,
    civilStatus: profile.civilStatus,
    pwd: profile.pwd,
    streetAddress: profile.address.street,
    barangay: profile.address.barangay,
    municipality: profile.address.municipality,
    district: profile.address.district,
    province: profile.address.province,
    motherName: profile.family.motherName,
    fatherName: profile.family.fatherName,
    highestEducation: profile.education.highestEducation,
    employmentStatus: profile.employment.status,
    employmentType: profile.employment.type,
    beneficiary: profile.beneficiary ?? {
      firstName: '',
      middleName: '',
      lastName: '',
      relationship: '',
      contactNumber: '',
      address: '',
      idNumber: '',
    },
  };
}

/** Local date as YYYY-MM-DD, the upper limit of the birth date picker. */
function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The first problem the admin should fix, or null. The server checks all of it again. */
function validate(form: UpdateTraineePayload): string | null {
  const required: [string, string][] = [
    ['First name', form.firstName],
    ['Last name', form.lastName],
    ['Date of birth', form.dateOfBirth],
    ['Place of birth', form.placeOfBirth],
    ['Street', form.streetAddress],
    ['Barangay', form.barangay],
    ['Municipality / City', form.municipality],
    ['District', form.district],
    ['Province', form.province],
    ["Mother's name", form.motherName],
    ["Father's name", form.fatherName],
    ['Beneficiary first name', form.beneficiary.firstName],
    ['Beneficiary last name', form.beneficiary.lastName],
    ['Beneficiary relationship', form.beneficiary.relationship],
    ['Beneficiary address', form.beneficiary.address],
    ['Beneficiary ID number', form.beneficiary.idNumber],
  ];
  const missing = required.find(([, value]) => !value.trim());
  if (missing) return `${missing[0]} is required.`;
  if (form.dateOfBirth > todayInputValue()) return 'Date of birth cannot be in the future.';
  if (!/^\+63\d{10}$/.test(form.contactNumber)) return 'Contact number must be 10 digits after +63.';
  if (!/^\+63\d{10}$/.test(form.beneficiary.contactNumber)) return 'Beneficiary contact number must be 10 digits after +63.';
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.';
  return null;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500 first:mt-0">{children}</h3>
);

const PhoneInput: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <div className="flex">
    <span className="flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-sm text-slate-600">+63</span>
    <input
      type="tel"
      inputMode="numeric"
      maxLength={10}
      placeholder="9171234567"
      value={value.replace(/^\+63/, '')}
      onChange={(event) => onChange(`+63${event.target.value.replace(/\D/g, '').slice(0, 10)}`)}
      className={`${inputClass} rounded-l-none`}
    />
  </div>
);

interface TraineeEditModalProps {
  profile: TraineeProfile;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** The admin's one form for a trainee's details. The username and password are never editable. */
const TraineeEditModal: React.FC<TraineeEditModalProps> = ({ profile, onClose, onSaved }) => {
  const [form, setForm] = useState<UpdateTraineePayload>(() => toForm(profile));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (changes: Partial<UpdateTraineePayload>) => setForm((current) => ({ ...current, ...changes }));
  const setBeneficiary = (changes: Partial<UpdateTraineePayload['beneficiary']>) =>
    setForm((current) => ({ ...current, beneficiary: { ...current.beneficiary, ...changes } }));

  const text = (key: Exclude<keyof UpdateTraineePayload, 'pwd' | 'beneficiary'>, maxLength = 100) => (
    <input value={form[key]} maxLength={maxLength} onChange={(event) => set({ [key]: event.target.value })} className={inputClass} />
  );
  const beneficiaryText = (key: keyof UpdateTraineePayload['beneficiary'], maxLength = 50) => (
    <input value={form.beneficiary[key]} maxLength={maxLength} onChange={(event) => setBeneficiary({ [key]: event.target.value })} className={inputClass} />
  );
  const select = (key: 'gender' | 'civilStatus' | 'highestEducation' | 'employmentStatus' | 'employmentType', options: readonly string[]) => (
    <select value={form[key]} onChange={(event) => set({ [key]: event.target.value })} className={inputClass}>
      {options.map((option) => (
        <option key={option} value={option}>
          {enumLabel(option)}
        </option>
      ))}
    </select>
  );

  const handleSave = async () => {
    const problem = validate(form);
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await updateTrainee(profile.id, form);
      onSaved(`${fullName(form)}'s details were saved.`);
    } catch (err: unknown) {
      setError(requestErrorMessage(err, 'Failed to save the trainee.'));
      setSaving(false);
    }
  };

  return (
    <ProfileModal
      title="Edit Trainee"
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButtonClass}>
            Cancel
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving} className={primaryButtonClass}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <SectionTitle>Personal Details</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First Name *">{text('firstName')}</FormField>
        <FormField label="Middle Name">{text('middleName')}</FormField>
        <FormField label="Last Name *">{text('lastName')}</FormField>
        <FormField label="Username (cannot be changed)">
          <input value={valueOrDash(profile.username)} disabled className={inputClass} />
        </FormField>
        <FormField label="Gender *">{select('gender', GENDERS)}</FormField>
        <FormField label="Date of Birth *">
          <input type="date" value={form.dateOfBirth} max={todayInputValue()} onChange={(event) => set({ dateOfBirth: event.target.value })} className={inputClass} />
        </FormField>
        <FormField label="Place of Birth *">{text('placeOfBirth')}</FormField>
        <FormField label="Citizenship">{text('citizenship')}</FormField>
        <FormField label="Civil Status *">{select('civilStatus', CIVIL_STATUSES)}</FormField>
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={form.pwd} onChange={(event) => set({ pwd: event.target.checked })} className="h-4 w-4" />
          Person with Disability
        </label>
      </div>

      <SectionTitle>Contact and Address</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Contact Number *">
          <PhoneInput value={form.contactNumber} onChange={(contactNumber) => set({ contactNumber })} />
        </FormField>
        <FormField label="Email">{text('email', 255)}</FormField>
        <FormField label="Street *" wide>{text('streetAddress')}</FormField>
        <FormField label="Barangay *">{text('barangay')}</FormField>
        <FormField label="Municipality / City *">{text('municipality')}</FormField>
        <FormField label="District *">{text('district')}</FormField>
        <FormField label="Province *">{text('province')}</FormField>
      </div>

      <SectionTitle>Family</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Mother's Name *">{text('motherName')}</FormField>
        <FormField label="Father's Name *">{text('fatherName')}</FormField>
      </div>

      <SectionTitle>Education and Employment</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Highest Education *" wide>{select('highestEducation', HIGHEST_EDUCATIONS)}</FormField>
        <FormField label="Employment Status *">{select('employmentStatus', EMPLOYMENT_STATUSES)}</FormField>
        <FormField label="Employment Type *">{select('employmentType', EMPLOYMENT_TYPES)}</FormField>
      </div>

      <SectionTitle>Beneficiary</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First Name *">{beneficiaryText('firstName')}</FormField>
        <FormField label="Middle Name">{beneficiaryText('middleName')}</FormField>
        <FormField label="Last Name *">{beneficiaryText('lastName')}</FormField>
        <FormField label="Relationship *">{beneficiaryText('relationship')}</FormField>
        <FormField label="Contact Number *">
          <PhoneInput value={form.beneficiary.contactNumber} onChange={(contactNumber) => setBeneficiary({ contactNumber })} />
        </FormField>
        <FormField label="ID Number *">{beneficiaryText('idNumber')}</FormField>
        <FormField label="Address *" wide>{beneficiaryText('address', 100)}</FormField>
      </div>

      {error && (
        <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </ProfileModal>
  );
};

export default TraineeEditModal;
