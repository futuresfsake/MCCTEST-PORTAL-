// src/pages/users/admin/staff-accounts/AdminStaffAccountsPage.tsx
import React, { useCallback, useEffect, useState } from 'react';
import Header from '../../../../components/layout/Header';
import { StaffTable } from '../../../../components/admin/staff-accounts/StaffTable';
import { StaffFormModal } from '../../../../components/admin/staff-accounts/StaffFormModal';
import { ResetPasswordModal } from '../../../../components/admin/staff-accounts/ResetPasswordModal';
import {
  adminApi,
  type StaffMember,
  type StaffRole,
  type CreateStaffPayload,
  type UpdateStaffPayload,
} from '../../../../api/users/admin.api';

type StatusFilter = 'all' | 'active' | 'inactive';

export const AdminStaffAccountsPage: React.FC = () => {
  // ── Data ──
const [staff, setStaffState] = useState<StaffMember[]>([]);

const setStaff = (value: StaffMember[] | ((prev: StaffMember[]) => StaffMember[])) => {
  console.log('setStaff called:', value);

  if (typeof value === 'function') {
    setStaffState((prev) => {
      const next = value(prev);

      console.log('setStaff functional update result:', {
        value: next,
        isArray: Array.isArray(next),
      });

      return next;
    });
    return;
  }

  console.log('setStaff direct value:', {
    value,
    isArray: Array.isArray(value),
    type: typeof value,
  });

  setStaffState(value);
};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Filters ──
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ── Modals ──
  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    member: StaffMember | null;
  }>({ open: false, mode: 'create', member: null });

  const [resetModal, setResetModal] = useState<{
    open: boolean;
    member: StaffMember | null;
  }>({ open: false, member: null });

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch ──
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: { role?: StaffRole; isActive?: boolean } = {};
      if (roleFilter) filters.role = roleFilter;
      if (statusFilter === 'active') filters.isActive = true;
      if (statusFilter === 'inactive') filters.isActive = false;

      const data = await adminApi.listStaff(filters);
      console.log('Raw API response:', data);   
      setStaff(Array.isArray(data) ? data : (data as any).data ?? (data as any).staff ?? []);         
    } catch (err: any) {
      setError(err.message ?? 'Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Handlers ──
  const handleCreate = () =>
    setFormModal({ open: true, mode: 'create', member: null });

  const handleEdit = (member: StaffMember) =>
    setFormModal({ open: true, mode: 'edit', member });

  const handleFormSubmit = async (payload: CreateStaffPayload | UpdateStaffPayload) => {
    if (formModal.mode === 'create') {
      const result = await adminApi.createStaff(payload as CreateStaffPayload);
      showToast(`Account created — system ID: ${result.system_id}`);
    } else if (formModal.member) {
      await adminApi.updateStaff(formModal.member.id, payload as UpdateStaffPayload);
      showToast('Staff details updated');
    }
    await fetchStaff();
  };

  const handleToggleStatus = async (member: StaffMember) => {
    try {
      const result = await adminApi.setStatus(member.id, !member.is_active);
      showToast(result.message);
      await fetchStaff();
    } catch (err: any) {
      showToast(err.message ?? 'Failed to update status', 'error');
    }
  };

  const handleResetPassword = (member: StaffMember) =>
    setResetModal({ open: true, member });

  const handleResetConfirm = async () => {
    if (!resetModal.member) return;
    await adminApi.resetPassword(resetModal.member.id);
  };

  console.log('StaffTable staff:', {
  value: staff,
  isArray: Array.isArray(staff),
  type: typeof staff,
  length: Array.isArray(staff) ? staff.length : undefined,
});

console.log(staff)
  // ── Render ──
  return (
    <div className="min-h-screen bg-gray-50">
        < Header />      
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* ── Page header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Staff accounts</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage registrar, trainer, and encoder accounts.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add staff
          </button>
        </div>

        {/* ── Fetch error ── */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}{' '}
            <button
              onClick={fetchStaff}
              className="underline underline-offset-2 hover:text-red-900"
            >
              Try again
            </button>
          </div>
        )}

        {/* ── Staff table ── */}
        <StaffTable
          staff={staff}
          loading={loading}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
          onRoleFilterChange={setRoleFilter}
          onStatusFilterChange={setStatusFilter}
          onEdit={handleEdit}
          onToggleStatus={handleToggleStatus}
          onResetPassword={handleResetPassword}
        />
      </div>

      {/* ── Modals ── */}
      <StaffFormModal
        open={formModal.open}
        mode={formModal.mode}
        initial={formModal.member}
        onClose={() => setFormModal((s) => ({ ...s, open: false }))}
        onSubmit={handleFormSubmit}
      />

      <ResetPasswordModal
        open={resetModal.open}
        member={resetModal.member}
        onClose={() => setResetModal({ open: false, member: null })}
        onConfirm={handleResetConfirm}
      />

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-gray-900 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="h-4 w-4 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 shrink-0 text-red-200" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
};
