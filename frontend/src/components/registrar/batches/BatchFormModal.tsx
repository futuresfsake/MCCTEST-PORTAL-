// src/components/admin/batches/BatchFormModal.tsx

import React, { useEffect, useState } from 'react';
import type { BatchRow } from './BatchTable';

interface Program {
  id: string;
  name: string;
  program_code: string;
}

interface Trainer {
  id: string;
  full_name: string;
}

interface FormData {
  program_id: string;
  trainer_id: string;
  batch_name: string;
  capacity: string;
  start_date: string;
  end_date: string;
  remarks: string;
}

interface Props {
  open: boolean;
  batch?: BatchRow | null;
  programs: Program[];
  trainers: Trainer[];
  onClose: () => void;
  onSubmit: (data: FormData) => Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
}

const EMPTY: FormData = {
  program_id: '',
  trainer_id: '',
  batch_name: '',
  capacity: '',
  start_date: '',
  end_date: '',
  remarks: '',
};

const CRITICAL_LOCKED_STATUSES = ['ONGOING', 'CLOSED', 'CANCELLED'];

export const BatchFormModal: React.FC<Props> = ({
  open,
  batch,
  programs,
  trainers,
  onClose,
  onSubmit,
  onDirtyChange,
}) => {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [initialForm, setInitialForm] = useState<FormData>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isEdit = !!batch;
  const isLocked = isEdit && CRITICAL_LOCKED_STATUSES.includes(batch?.batch_status ?? '');

  useEffect(() => {
    let nextForm: FormData;
    if (!open) {
      onDirtyChange?.(false);
      return;
    }
    setServerError(null);
    setErrors({});

    if (batch) {
      nextForm = {
        program_id: batch.program?.id ?? '',
        trainer_id: batch.trainer?.id ?? '',
        batch_name: batch.batch_name,
        capacity: String(batch.capacity),
        start_date: batch.start_date?.slice(0, 10) ?? '',
        end_date: batch.end_date?.slice(0, 10) ?? '',
        remarks: '',
      };
    } else {
      nextForm = EMPTY;
    }

    setForm(nextForm);
    setInitialForm(nextForm);
    onDirtyChange?.(false);
  }, [open, batch, onDirtyChange]);

  useEffect(() => {
    if (!open) return;
    const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);
    onDirtyChange?.(dirty);
  }, [form, initialForm, open, onDirtyChange]);

  function set(field: keyof FormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const next: Partial<FormData> = {};
    if (!form.program_id) next.program_id = 'Select a program';
    if (!form.trainer_id) next.trainer_id = 'Select a trainer';
    if (!form.batch_name.trim()) next.batch_name = 'Batch name is required';
    if (!form.capacity || Number(form.capacity) < 1) next.capacity = 'Must be at least 1';
    if (!form.start_date) next.start_date = 'Start date is required';
    if (!form.end_date) next.end_date = 'End date is required';
    if (form.start_date && form.end_date && form.end_date <= form.start_date) {
      next.end_date = 'End date must be after start date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await onSubmit(form);
      onDirtyChange?.(false);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-6 md:px-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
                Batch Management
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-950">
                {isEdit ? 'Edit batch details' : 'Create new batch'}
              </h2>
              {isLocked && (
                <p className="mt-1 text-xs text-amber-700 font-medium">
                  Some fields are locked — batch status is {batch?.batch_status.toLowerCase()}
                </p>
              )}
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

        {/* Server Error */}
        {serverError && (
          <div className="mx-6 mt-6 border-l-4 border-red-500 bg-red-50 px-4 py-3 md:mx-8">
            <p className="text-xs font-semibold text-red-700">Unable to save batch</p>
            <p className="mt-1 text-xs leading-5 text-red-600">{serverError}</p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="overflow-y-auto px-6 py-6 md:px-8 space-y-5">
          <div className="border-l-4 border-yellow-400 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Batch configuration
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Specify program assignment, instructors, and scheduling details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Program" error={errors.program_id}>
                <select
                  value={form.program_id}
                  onChange={(e) => set('program_id', e.target.value)}
                  disabled={isEdit}
                  className={`w-full border bg-white px-3 py-2.5 text-sm text-slate-800 transition focus:outline-none focus:ring-1 focus:ring-blue-900 ${
                    errors.program_id ? 'border-red-400' : 'border-slate-200'
                  } ${isEdit ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
                >
                  <option value="">Select program…</option>
                  {programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.program_code})
                    </option>
                  ))}
                </select>
                {isEdit && (
                  <p className="mt-1.5 text-[10px] text-slate-400">Program cannot be changed after creation.</p>
                )}
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Trainer" error={errors.trainer_id}>
                <select
                  value={form.trainer_id}
                  onChange={(e) => set('trainer_id', e.target.value)}
                  className={`w-full border bg-white px-3 py-2.5 text-sm text-slate-800 transition focus:outline-none focus:ring-1 focus:ring-blue-900 ${
                    errors.trainer_id ? 'border-red-400' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select trainer…</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Batch name" error={errors.batch_name}>
                <input
                  type="text"
                  value={form.batch_name}
                  onChange={(e) => set('batch_name', e.target.value)}
                  placeholder="e.g. Batch 1 - CSS"
                  className={inputClass(!!errors.batch_name, false)}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Max slots / Capacity" error={errors.capacity}>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => set('capacity', e.target.value)}
                  placeholder="25"
                  disabled={isLocked}
                  className={inputClass(!!errors.capacity, isLocked)}
                />
              </Field>
            </div>

            <div>
              <Field label="Start date" error={errors.start_date}>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => set('start_date', e.target.value)}
                  disabled={isLocked}
                  className={inputClass(!!errors.start_date, isLocked)}
                />
              </Field>
            </div>

            <div>
              <Field label="End date" error={errors.end_date}>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => set('end_date', e.target.value)}
                  disabled={isLocked}
                  className={inputClass(!!errors.end_date, isLocked)}
                />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Remarks" error={undefined}>
                <textarea
                  value={form.remarks}
                  onChange={(e) => set('remarks', e.target.value)}
                  placeholder="Optional notes…"
                  rows={2}
                  className={inputClass(false, false) + ' resize-none'}
                />
              </Field>
            </div>
          </div>

          {/* Footer inside form context */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 -mx-6 -mb-6 px-6 py-5 sm:flex-row sm:justify-end md:-mx-8 md:-px-8">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-blue-900 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean, disabled: boolean) {
  return [
    'w-full border bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 transition focus:outline-none focus:ring-1 focus:ring-blue-900',
    hasError ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : 'border-slate-200 focus:border-blue-900',
    disabled ? 'cursor-not-allowed bg-slate-50 text-slate-400' : '',
  ]
    .filter(Boolean)
    .join(' ');
}