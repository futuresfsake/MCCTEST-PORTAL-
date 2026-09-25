// src/components/admin/batches/BatchStatusBadge.tsx

import React from 'react';

export type BatchStatus = 'OPEN' | 'ONGOING' | 'CLOSED' | 'CANCELLED';

interface Props {
  status: BatchStatus;
}

const CONFIG: Record<BatchStatus, { label: string; classes: string }> = {
  OPEN: {
    label: 'Open',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
  ONGOING: {
    label: 'Ongoing',
    classes: 'border-blue-200 bg-blue-50 text-blue-900',
  },
  CLOSED: {
    label: 'Closed',
    classes: 'border-slate-200 bg-slate-50 text-slate-700',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'border-red-200 bg-red-50 text-red-800',
  },
};

export const BatchStatusBadge: React.FC<Props> = ({ status }) => {
  const config = CONFIG[status] ?? {
    label: status,
    classes: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </span>
  );
};