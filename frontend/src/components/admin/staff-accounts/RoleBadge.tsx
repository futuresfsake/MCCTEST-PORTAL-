// src/components/admin/staff-accounts/RoleBadge.tsx
import React from 'react';
import type { StaffRole } from '../../../api/users/admin.api';

const ROLE_CONFIG: Record<StaffRole, { label: string; classes: string }> = {
  REGISTRAR: {
    label: 'Registrar',
    classes: 'bg-violet-100 text-violet-700 ring-violet-200',
  },
  TRAINER: {
    label: 'Trainer',
    classes: 'bg-sky-100 text-sky-700 ring-sky-200',
  },
  ENCODER: {
    label: 'Encoder',
    classes: 'bg-amber-100 text-amber-700 ring-amber-200',
  },
};

interface RoleBadgeProps {
  role: StaffRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    classes: 'bg-gray-100 text-gray-600 ring-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.classes}`}
    >
      {config.label}
    </span>
  );
};
