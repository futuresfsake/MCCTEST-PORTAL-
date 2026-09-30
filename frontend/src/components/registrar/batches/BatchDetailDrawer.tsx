// src/components/admin/batches/BatchDetailDrawer.tsx

import React from 'react';
import type { BatchRow } from './BatchTable';
import { BatchStatusBadge } from './BatchStatusBadge';

export interface BatchDetail extends BatchRow {
  session_count?: number;
  attendance_rate?: number;
}

interface Props {
  open: boolean;
  batch: BatchDetail | null;
  onClose: () => void;
  onEdit: (batch: BatchRow) => void;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';

  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      <span className="text-xs font-semibold text-slate-800">
        {value}
      </span>
    </div>
  );
}

export const BatchDetailDrawer: React.FC<Props> = ({
  open,
  batch,
  onClose,
  onEdit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="relative flex w-screen max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">

          {/* Header */}
          <div className="border-b border-slate-200 px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Batch Information
                </p>

                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  {batch?.batch_name ?? 'Batch Details'}
                </h2>

                <div className="mt-2">
                  {batch && (
                    <BatchStatusBadge status={batch.batch_status} />
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-blue-900"
              >
                <i className="fa-solid fa-xmark text-sm" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            {batch ? (
              <>
                <Section title="Program">
                  <Stat
                    label="Name"
                    value={batch.program?.name ?? '—'}
                  />

                  <Stat
                    label="Code"
                    value={batch.program?.program_code ?? '—'}
                  />
                </Section>

                <Section title="Trainer">
                  <Stat
                    label="Full name"
                    value={batch.trainer?.full_name ?? '—'}
                  />
                </Section>

                <Section title="Schedule">
                  <Stat
                    label="Start date"
                    value={formatDate(batch.start_date)}
                  />

                  <Stat
                    label="End date"
                    value={formatDate(batch.end_date)}
                  />
                </Section>

                <Section title="Enrollment">
                  <Stat
                    label="Capacity"
                    value={batch.capacity}
                  />

                  <Stat
                    label="Enrolled"
                    value={batch.enrollment_count}
                  />

                  <Stat
                    label="Available slots"
                    value={
                      <span
                        className={
                          batch.available_slots === 0
                            ? 'font-bold text-red-600'
                            : 'font-bold text-green-700'
                        }
                      >
                        {batch.available_slots}
                      </span>
                    }
                  />
                </Section>

                {/* Remarks */}
                <Section title="Remarks">
                  <div className="col-span-2">
                    <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-slate-700">
                      {batch.remarks?.trim() || 'No remarks provided.'}
                    </p>
                  </div>
                </Section>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-slate-400">
                No batch selected
              </div>
            )}
          </div>

          {/* Footer */}
          {batch &&
            batch.batch_status !== 'CANCELLED' &&
            batch.batch_status !== 'CLOSED' && (
              <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onEdit(batch)}
                  className="w-full bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950"
                >
                  Edit batch
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>

      <div className="grid grid-cols-2 gap-3 border border-slate-200 bg-slate-50 p-4">
        {children}
      </div>
    </div>
  );
}

export default BatchDetailDrawer;
