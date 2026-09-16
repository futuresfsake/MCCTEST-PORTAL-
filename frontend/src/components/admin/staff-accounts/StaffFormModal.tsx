// src/components/admin/staff-accounts/StaffFormModal.tsx

import React, { useEffect, useState } from 'react'

import type {
  StaffMember,
  CreateStaffPayload,
  UpdateStaffPayload,
  StaffRole,
} from '../../../api/users/admin.api'

interface StaffFormModalProps {
  open: boolean
  mode: 'create' | 'edit'
  initial?: StaffMember | null
  onClose: () => void
  onSubmit: (
    payload: CreateStaffPayload | UpdateStaffPayload,
  ) => Promise<void>
}

const ROLES: { value: StaffRole; label: string }[] = [
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'TRAINER', label: 'Trainer' },
  { value: 'ENCODER', label: 'Encoder' },
]

interface FormState {
  firstName: string
  lastName: string
  middleName: string
  email: string
  role: StaffRole | ''
  password: string
  employeeId: string // TODO: wire to schema field once confirmed
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  middleName: '',
  email: '',
  role: '',
  password: '',
  employeeId: '',
}

export const StaffFormModal: React.FC<StaffFormModalProps> = ({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState, string>>
  >({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')

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
      })
    } else {
      setForm(EMPTY)
    }

    setErrors({})
    setApiError('')
  }, [open, mode, initial])

  const set =
    (field: keyof FormState) =>
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
      setForm((current) => ({
        ...current,
        [field]: e.target.value,
      }))

      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }))
    }

  const validate = (): boolean => {
    const next: typeof errors = {}

    if (!form.firstName.trim()) {
      next.firstName = 'First name is required'
    }

    if (!form.lastName.trim()) {
      next.lastName = 'Last name is required'
    }

    if (!form.middleName.trim()) {
      next.middleName = 'Middle name is required'
    }

    if (mode === 'create') {
      if (!form.email.trim()) {
        next.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        next.email = 'Enter a valid email address'
      }

      if (!form.role) {
        next.role = 'Select a role'
      }

      if (!form.password) {
        next.password = 'Password is required'
      } else if (form.password.length < 8) {
        next.password = 'Password must be at least 8 characters'
      }
    }

    setErrors(next)

    return Object.keys(next).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setSubmitting(true)
    setApiError('')

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
        } satisfies CreateStaffPayload)
      } else {
        await onSubmit({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          middleName: form.middleName.trim(),
          // TODO: employeeId: form.employeeId
        } satisfies UpdateStaffPayload)
      }

      onClose()
    } catch (err: any) {
      setApiError(
        err.message ?? 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-6 md:px-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
                Staff accounts
              </p>

              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                {mode === 'create'
                  ? 'Add staff account'
                  : 'Edit staff details'}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {mode === 'create'
                  ? 'Create a new staff login and provide the account credentials.'
                  : 'Update the staff member’s basic information. Authentication changes are managed separately.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close modal"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-blue-900 disabled:opacity-50"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* API error */}
        {apiError && (
          <div className="mx-6 mt-6 border-l-4 border-red-500 bg-red-50 px-4 py-3 md:mx-8">
            <p className="text-xs font-semibold text-red-700">
              Unable to save changes
            </p>
            <p className="mt-1 text-xs leading-5 text-red-600">
              {apiError}
            </p>
          </div>
        )}

        {/* Form */}
        <div className="overflow-y-auto px-6 py-6 md:px-8">
          <div className="mb-6 border-l-4 border-yellow-400 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Account information
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Enter the staff member’s official information carefully.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2">
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

            <div className="sm:col-span-2">
              <Field
                label="Middle name"
                value={form.middleName}
                onChange={set('middleName')}
                error={errors.middleName}
                placeholder="Santos"
              />
            </div>

            {/* Email */}
            {mode === 'create' ? (
              <div className="sm:col-span-2">
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  error={errors.email}
                  placeholder="juan.delacruz@gmail.com"
                />
              </div>
            ) : (
              <div className="sm:col-span-2">
                <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </label>

                <div className="border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <p className="text-sm text-slate-600">
                    {initial?.email ?? '—'}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Managed via Supabase Auth
                  </p>
                </div>
              </div>
            )}

            {/* TODO: Employee ID
            <div className="sm:col-span-2">
              <Field
                label="Employee ID"
                value={form.employeeId}
                onChange={set('employeeId')}
                error={errors.employeeId}
                placeholder="EMP-2026-001"
              />
            </div>
            */}

            {/* Role */}
            {mode === 'create' && (
              <div className="sm:col-span-2">
                <label
                  htmlFor="staff-role"
                  className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  Role
                </label>

                <select
                  id="staff-role"
                  value={form.role}
                  onChange={set('role')}
                  className={`w-full border bg-white px-3 py-2.5 text-sm text-slate-800 transition focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900 ${
                    errors.role
                      ? 'border-red-400'
                      : 'border-slate-200'
                  }`}
                >
                  <option value="">Select a role</option>

                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>

                {errors.role && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {errors.role}
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            {mode === 'create' && (
              <div className="sm:col-span-2">
                <Field
                  label="Temporary password"
                  type="password"
                  value={form.password}
                  onChange={set('password')}
                  error={errors.password}
                  placeholder="Minimum 8 characters"
                />

                <p className="mt-2 text-[10px] leading-5 text-slate-400">
                  The staff member can use this password to sign in and
                  change it according to your authentication policy.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end md:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-blue-900 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
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
  )
}

// Internal field component 

interface FieldProps {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  placeholder?: string
  type?: string
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
    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
      {label}
    </label>

    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full border bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 transition focus:outline-none focus:ring-1 focus:ring-blue-900 ${
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
          : 'border-slate-200 focus:border-blue-900'
      }`}
    />

    {error && (
      <p className="mt-1.5 text-xs text-red-500">
        {error}
      </p>
    )}
  </div>
)
