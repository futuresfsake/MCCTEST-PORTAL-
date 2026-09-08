// src/components/admin/staff-accounts/StaffFormModal.tsx
import React, { useEffect, useState } from 'react';
import type { StaffMember, CreateStaffPayload, UpdateStaffPayload, StaffRole } from '../../../api/users/admin.api';

interface StaffFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: StaffMember | null;
  onClose: () => void;
  onSubmit: (payload: CreateStaffPayload | UpdateStaffPayload) => Promise<void>;
}

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'TRAINER', label: 'Trainer' },
  { value: 'ENCODER', label: 'Encoder' },
];

interface FormState {
  firstName: string;
  lastName: string;
  middleName: string;
  email: string;
  role: StaffRole | '';
  password: string;
  employeeId: string; // TODO: wire to schema field once confirmed
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  role: '',
  password: '',
  employeeId: '',
};

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Populate fields when editing
  useEffect(() => {
    if (mode === 'edit' && initial) {
      setForm({
        firstName: initial.first_name,
        lastName: initial.last_name,
        middleName: initial.middle_name,
        email: initial.email ?? '',
        role: initial.role,
        password: '',
        employeeId: '', // TODO: initial.employee_id
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setApiError('');
  }, [open, mode, initial]);

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: typeof errors = {};

    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    if (!form.middleName.trim()) next.middleName = 'Middle name is required';

    if (mode === 'create') {
      if (!form.email.trim()) {
        next.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        next.email = 'Enter a valid email address';
      }

      if (!form.role) next.role = 'Select a role';

      if (!form.password) {
        next.password = 'Password is required';
      } else if (form.password.length < 8) {
        next.password = 'Password must be at least 8 characters';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    try {
      if (mode === 'create') {
        await onSubmit({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim(),
          email: form.email.trim(),
          role: form.role as StaffRole,
          password: form.password,
          // TODO: employeeId: form.employeeId
        } satisfies CreateStaffPayload);
      } else {
        await onSubmit({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim(),
          // TODO: employeeId: form.employeeId
        } satisfies UpdateStaffPayload);
      }
      onClose();
    } catch (err: any) {
      setApiError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {mode === 'create' ? 'Add staff account' : 'Edit staff details'}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              {mode === 'create'
                ? 'Creates a login and sends credentials to the staff member.'
                : 'Only name fields can be edited here. Use reset password for auth changes.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* API error */}
        {apiError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="First name"
            value={form.firstName}
            onChange={set('firstName')}
            error={errors.firstName}
            placeholder="Juan"
          />
          <Field
            label="Last name"
            value={form.lastName}
            onChange={set('lastName')}
            error={errors.lastName}
            placeholder="Dela Cruz"
          />
          <div className="col-span-2">
            <Field
              label="Middle name"
              value={form.middleName}
              onChange={set('middleName')}
              error={errors.middleName}
              placeholder="Santos"
            />
          </div>

          {/* Email — shown in create mode; read-only hint in edit mode */}
          {mode === 'create' ? (
            <div className="col-span-2">
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                placeholder="juan@mcctp.gov.ph"
              />
            </div>
          ) : (
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Email
              </label>
              <p className="text-sm text-gray-500">
                {initial?.email ?? '—'}{' '}
                <span className="text-xs text-gray-400">(managed via Supabase Auth)</span>
              </p>
            </div>
          )}

          {/* TODO: Employee ID — uncomment once employee_id is added to the schema
          <div className="col-span-2">
            <Field
              label="Employee ID"
              value={form.employeeId}
              onChange={set('employeeId')}
              error={errors.employeeId}
              placeholder="EMP-2026-001"
            />
          </div>
          */}

          {/* Role — create mode only */}
          {mode === 'create' && (
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Role
              </label>
              <select
                value={form.role}
                onChange={set('role')}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  errors.role ? 'border-red-400' : 'border-gray-200'
                }`}
              >
                <option value="">Select a role</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-red-500">{errors.role}</p>
              )}
            </div>
          )}

          {/* Password — create mode only */}
          {mode === 'create' && (
            <div className="col-span-2">
              <Field
                label="Temporary password"
                type="password"
                value={form.password}
                onChange={set('password')}
                error={errors.password}
                placeholder="Min. 8 characters"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting
              ? mode === 'create'
                ? 'Creating…'
                : 'Saving…'
              : mode === 'create'
              ? 'Create account'
              : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Internal field component ─────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  type?: string;
}

const Field: React.FC<FieldProps> = ({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
}) => (
  <div>
    <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
        error ? 'border-red-400' : 'border-gray-200'
      }`}
    />
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);
