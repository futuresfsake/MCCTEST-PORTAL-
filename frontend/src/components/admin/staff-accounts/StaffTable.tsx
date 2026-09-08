// src/components/admin/staff-accounts/StaffTable.tsx
import React from 'react';
import { RoleBadge } from './RoleBadge';
import type { StaffMember, StaffRole } from '../../../api/users/admin.api';

interface StaffTableProps {
  staff: StaffMember[];
  loading: boolean;
  roleFilter: StaffRole | '';
  statusFilter: 'all' | 'active' | 'inactive';
  onRoleFilterChange: (role: StaffRole | '') => void;
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void;
  onEdit: (member: StaffMember) => void;
  onToggleStatus: (member: StaffMember) => void;
  onResetPassword: (member: StaffMember) => void;
}

const ROLE_OPTIONS: { value: StaffRole | ''; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'TRAINER', label: 'Trainer' },
  { value: 'ENCODER', label: 'Encoder' },
];

export const StaffTable: React.FC<StaffTableProps> = ({
  staff,
  loading,
  roleFilter,
  statusFilter,
  onRoleFilterChange,
  onStatusFilterChange,
  onEdit,
  onToggleStatus,
  onResetPassword,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value as StaffRole | '')}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex rounded-md border border-gray-200 bg-white shadow-sm">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusFilterChange(s)}
              className={`px-3 py-1.5 text-sm capitalize transition-colors first:rounded-l-md last:rounded-r-md ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="ml-auto text-sm text-gray-400">
          {staff.length} {staff.length === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              {['Name', 'System ID', 'Email', 'Role', 'Status', ''].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              // Skeleton rows
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-gray-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
                  No staff accounts found. Create one to get started.
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr
                  key={member.id}
                  className={`transition-colors hover:bg-gray-50 ${
                    !member.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {member.first_name[0]}{member.last_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.last_name}, {member.first_name}
                        </p>
                        <p className="text-xs text-gray-400">{member.middle_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-600">
                      {member.system_id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {member.email ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        member.is_active ? 'text-emerald-600' : 'text-gray-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          member.is_active ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(member)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onResetPassword(member)}
                        className="rounded-md px-2.5 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        Reset password
                      </button>
                      <button
                        onClick={() => onToggleStatus(member)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                          member.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {member.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
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
