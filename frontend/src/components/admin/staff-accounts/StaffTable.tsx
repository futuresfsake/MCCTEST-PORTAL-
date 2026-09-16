// src/components/admin/staff-accounts/StaffTable.tsx

import React from 'react'

import { RoleBadge } from './RoleBadge'

import type { StaffMember, StaffRole } from '../../../api/users/admin.api'

interface StaffTableProps {
  staff: StaffMember[]
  loading: boolean
  roleFilter: StaffRole | ''
  statusFilter: 'all' | 'active' | 'inactive'
  onRoleFilterChange: (role: StaffRole | '') => void
  onStatusFilterChange: (status: 'all' | 'active' | 'inactive') => void
  onEdit: (member: StaffMember) => void
  onToggleStatus: (member: StaffMember) => void
  onResetPassword: (member: StaffMember) => void
}

const ROLE_OPTIONS: { value: StaffRole | ''; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'REGISTRAR', label: 'Registrar' },
  { value: 'TRAINER', label: 'Trainer' },
  { value: 'ENCODER', label: 'Encoder' },
]

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
    <div className="flex flex-col gap-8">
      {/* ── Filters ── */}
      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
              Staff accounts
            </p>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">
              Manage system users
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Filter staff accounts by role or account status.
            </p>
          </div>

          <span className="hidden text-xs font-medium text-slate-400 sm:block">
            {staff.length} {staff.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-y border-slate-200 bg-slate-50 px-4 py-4">
          {/* Role filter */}
          <div className="flex items-center gap-3">
            <label
              htmlFor="staff-role-filter"
              className="text-[10px] font-semibold uppercase tracking-wider text-slate-400"
            >
              Role
            </label>

            <select
              id="staff-role-filter"
              value={roleFilter}
              onChange={(e) =>
                onRoleFilterChange(e.target.value as StaffRole | '')
              }
              className="border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Status
            </span>

            <div className="flex border border-slate-200 bg-white">
              {(['all', 'active', 'inactive'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onStatusFilterChange(status)}
                  className={`border-r border-slate-200 px-3 py-2 text-xs font-semibold capitalize transition last:border-r-0 ${
                    statusFilter === status
                      ? 'bg-blue-900 text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-blue-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <span className="ml-auto text-xs font-medium text-slate-400 sm:hidden">
            {staff.length} {staff.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="min-w-[900px] w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {['Name', 'System ID', 'Email', 'Role', 'Status', ''].map(
                (heading) => (
                  <th
                    key={heading}
                    className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    {heading}
                  </th>
                ),
              )}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, index) => (
                <tr
                  key={index}
                  className="border-b border-slate-100"
                >
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 animate-pulse bg-slate-100" />
                      <div className="space-y-2">
                        <div className="h-3 w-32 animate-pulse bg-slate-100" />
                        <div className="h-2.5 w-20 animate-pulse bg-slate-100" />
                      </div>
                    </div>
                  </td>

                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-5">
                      <div className="h-3 w-24 animate-pulse bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : staff.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-16 text-center"
                >
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center bg-slate-100 text-slate-400">
                      <i className="fa-solid fa-users text-sm" />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                      No staff accounts found
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Create a staff account to get started.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <tr
                  key={member.id}
                  className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${
                    !member.is_active ? 'opacity-60' : ''
                  }`}
                >
                  {/* Name */}
                  <td className="px-4 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-blue-50 text-[10px] font-bold text-blue-900">
                        {member.first_name[0]}
                        {member.last_name[0]}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {member.last_name}, {member.first_name}
                        </p>

                        {member.middle_name && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            {member.middle_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* System ID */}
                  <td className="px-4 py-5">
                    <span className="font-mono text-[11px] font-medium text-blue-900">
                      {member.system_id}
                    </span>
                  </td>

                  {/* Email */}
                  <td className="px-4 py-5 text-xs text-slate-600">
                    {member.email ?? (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Role */}
                  <td className="px-4 py-5">
                    <RoleBadge role={member.role} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-5">
                    <span
                      className={`inline-flex items-center gap-2 text-xs font-semibold ${
                        member.is_active
                          ? 'text-green-700'
                          : 'text-slate-400'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 ${
                          member.is_active
                            ? 'bg-green-600'
                            : 'bg-slate-300'
                        }`}
                      />

                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-5">
                    <div className="flex items-center justify-end gap-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onEdit(member)}
                        className="text-xs font-semibold text-slate-500 transition hover:text-blue-900"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => onResetPassword(member)}
                        className="text-xs font-semibold text-blue-900 transition hover:text-blue-950"
                      >
                        Reset password
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleStatus(member)}
                        className={`text-xs font-semibold transition ${
                          member.is_active
                            ? 'text-red-600 hover:text-red-700'
                            : 'text-green-700 hover:text-green-800'
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
  )
}
