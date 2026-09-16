// src/components/admin/staff-accounts/RoleBadge.tsx

import React from 'react'

import type { StaffRole } from '../../../api/users/admin.api'

const ROLE_CONFIG: Record<
  StaffRole,
  { label: string; classes: string }
> = {
  REGISTRAR: {
    label: 'Registrar',
    classes: 'border-blue-200 bg-blue-50 text-blue-900',
  },

  TRAINER: {
    label: 'Trainer',
    classes: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  },

  ENCODER: {
    label: 'Encoder',
    classes: 'border-slate-200 bg-slate-50 text-slate-700',
  },
}

interface RoleBadgeProps {
  role: StaffRole
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    classes: 'border-slate-200 bg-slate-50 text-slate-600',
  }

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${config.classes}`}
    >
      {config.label}
    </span>
  )
}
