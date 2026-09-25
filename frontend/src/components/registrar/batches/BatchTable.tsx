// src/components/admin/batches/BatchTable.tsx

import React from 'react';
import { BatchStatusBadge } from './BatchStatusBadge';
import type { BatchStatus } from './BatchStatusBadge';

export interface BatchRow {
  id: string;
  batch_name: string;
  batch_status: BatchStatus;
  program: { id: string; name: string; program_code: string } | null;
  trainer: { id: string; full_name: string } | null;
  start_date: string;
  end_date: string;
  capacity: number;
  enrollment_count: number;
  available_slots: number;
  remarks: string | null;
}

interface Props {
  batches: BatchRow[];
  loading: boolean;
  statusFilter: BatchStatus | 'ALL';
  onStatusFilterChange: (status: BatchStatus | 'ALL') => void;
  onView: (batch: BatchRow) => void;
  onEdit: (batch: BatchRow) => void;
}

function SlotBar({ enrolled, capacity }: { enrolled: number; capacity: number }) {
  const pct = capacity > 0 ? Math.min((enrolled / capacity) * 100, 100) : 0;
  const full = pct >= 100;
  const almostFull = pct >= 80;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden bg-slate-100">
        <div
          className={`h-full transition-all ${
            full ? 'bg-red-600' : almostFull ? 'bg-amber-500' : 'bg-green-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${full ? 'text-red-600' : 'text-slate-500'}`}>
        {enrolled}/{capacity}
      </span>
    </div>
  );
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_OPTIONS: Array<{ value: BatchStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const BatchTable: React.FC<Props> = ({
  batches,
  loading,
  statusFilter,
  onStatusFilterChange,
  onView,
  onEdit,
}) => {
  return (
    <div className="flex flex-col gap-8">
      {/* ── Filters Header ── */}
      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
              Batch Management
            </p>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              Manage training batches
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Filter batches by their current lifecycle status.
            </p>
          </div>

          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-y border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex items-center gap-3">
            <label
              htmlFor="batch-status-filter"
              className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Status
            </label>

            <select
              id="batch-status-filter"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as BatchStatus | 'ALL')}
              className="border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <span className="ml-auto text-xs font-medium text-slate-400 sm:hidden">
            {batches.length} {batches.length === 1 ? 'batch' : 'batches'}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="min-w-[900px] w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Batch', 'Program', 'Trainer', 'Dates', 'Slots', 'Status', ''].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="px-4 py-5">
                    <div className="space-y-2">
                      <div className="h-3 w-32 animate-pulse bg-slate-100" />
                      <div className="h-2.5 w-20 animate-pulse bg-slate-100" />
                    </div>
                  </td>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-5">
                      <div className="h-3 w-24 animate-pulse bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : batches.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center bg-slate-100 text-slate-400">
                      <i className="fa-solid fa-folder-open text-sm" />
                    </div>
                    <p className="mt-4 text-sm font-semibold text-slate-700">No batches found</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Try adjusting your filters or create a new batch.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              batches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-slate-100 transition-colors hover:bg-slate-50 cursor-pointer"
                  onClick={() => onView(b)}
                >
                  <td className="px-4 py-5">
                    <span className="text-xs font-semibold text-slate-800">{b.batch_name}</span>
                  </td>

                  <td className="px-4 py-5">
                    {b.program ? (
                      <div>
                        <span className="text-xs text-slate-700">{b.program.name}</span>
                        <span className="mt-1 block font-mono text-[10px] text-blue-900">
                          {b.program.program_code}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  <td className="px-4 py-5 text-xs text-slate-600">
                    {b.trainer?.full_name ?? <span className="text-slate-300">—</span>}
                  </td>

                  <td className="px-4 py-5 text-xs text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span>{formatDate(b.start_date)}</span>
                      <span className="text-[10px] text-slate-400">to {formatDate(b.end_date)}</span>
                    </div>
                  </td>

                  <td className="px-4 py-5">
                    <SlotBar enrolled={b.enrollment_count} capacity={b.capacity} />
                  </td>

                  <td className="px-4 py-5">
                    <BatchStatusBadge status={b.batch_status} />
                  </td>

                  <td className="px-4 py-5">
                    <div
                      className="flex items-center justify-end gap-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => onView(b)}
                        className="text-xs font-semibold text-slate-500 transition hover:text-blue-900"
                      >
                        View
                      </button>

                      {b.batch_status !== 'CANCELLED' && b.batch_status !== 'CLOSED' && (
                        <button
                          type="button"
                          onClick={() => onEdit(b)}
                          className="text-xs font-semibold text-blue-900 transition hover:text-blue-950"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};