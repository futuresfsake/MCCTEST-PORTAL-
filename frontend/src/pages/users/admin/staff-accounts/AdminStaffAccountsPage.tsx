import React, { useCallback, useEffect, useState } from 'react';

import Header from '../../../../components/layout/Header';
import Sidebar from '../../../../components/layout/Sidebar';
import Footer from '../../../../components/layout/Footer';
import { UnsavedChangesModal } from '../../../../components/common/UnsavedChangesModal';
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

const PAGE_SIZE = 10;

export const AdminStaffAccountsPage: React.FC = () => {
  // ── Data ──────────────────────────────────────────────────────────────
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formDirty, setFormDirty] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] =
    useState(false);

  // ── Filters & Pagination ──────────────────────────────────────────────
  const [roleFilter, setRoleFilter] = useState<StaffRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, statusFilter]);

  // ── Modals ────────────────────────────────────────────────────────────
  const handleFormClose = () => {
    if (formDirty) {
      setShowUnsavedChangesModal(true);
      return;
    }

    setFormModal((state) => ({
      ...state,
      open: false,
    }));
  };

  const [formModal, setFormModal] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    member: StaffMember | null;
  }>({
    open: false,
    mode: 'create',
    member: null,
  });

  const [resetModal, setResetModal] = useState<{
    open: boolean;
    member: StaffMember | null;
  }>({
    open: false,
    member: null,
  });

  // ── Toast ─────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const showToast = (
    message: string,
    type: 'success' | 'error' = 'success',
  ) => {
    setToast({ message, type });

    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: {
        role?: StaffRole;
        isActive?: boolean;
      } = {};

      if (roleFilter) {
        filters.role = roleFilter;
      }

      if (statusFilter === 'active') {
        filters.isActive = true;
      }

      if (statusFilter === 'inactive') {
        filters.isActive = false;
      }

      const data = await adminApi.listStaff(filters);

      const staffData = Array.isArray(data)
        ? data
        : (data as any).data ?? (data as any).staff ?? [];

      setStaff(staffData);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // ── Pagination Computed Values ────────────────────────────────────────
  const totalPages = Math.ceil(staff.length / PAGE_SIZE) || 1;
  const paginatedStaff = staff.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const firstItem = staff.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(currentPage * PAGE_SIZE, staff.length);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = () => {
    setFormModal({
      open: true,
      mode: 'create',
      member: null,
    });
  };

  const handleEdit = (member: StaffMember) => {
    setFormModal({
      open: true,
      mode: 'edit',
      member,
    });
  };

  const handleFormSubmit = async (
    payload: CreateStaffPayload | UpdateStaffPayload,
  ) => {
    try {
      if (formModal.mode === 'create') {
        const result = await adminApi.createStaff(
          payload as CreateStaffPayload,
        );

        showToast(`Account created — system ID: ${result.system_id}`);
      } else if (formModal.member) {
        await adminApi.updateStaff(
          formModal.member.id,
          payload as UpdateStaffPayload,
        );

        showToast('Staff details updated');
      }

      setFormDirty(false);

      setFormModal({
        open: false,
        mode: 'create',
        member: null,
      });

      await fetchStaff();
    } catch (err: any) {
      showToast(
        err.message ?? 'Failed to save staff account',
        'error',
      );
    }
  };

  const handleToggleStatus = async (member: StaffMember) => {
    try {
      const result = await adminApi.setStatus(
        member.id,
        !member.is_active,
      );

      showToast(result.message);
      await fetchStaff();
    } catch (err: any) {
      showToast(
        err.message ?? 'Failed to update status',
        'error',
      );
    }
  };

  const handleResetPassword = (member: StaffMember) => {
    setResetModal({
      open: true,
      member,
    });
  };

  const handleResetConfirm = async () => {
    if (!resetModal.member) return;

    await adminApi.resetPassword(resetModal.member.id);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="admin" />

        <main className="min-w-0 flex-1">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
              <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Administration
                  </p>

                  <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                    Staff accounts
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                    Manage registrar, trainer, and encoder accounts,
                    including their access status and password resets.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCreate}
                  className="shrink-0 bg-blue-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-950"
                >
                  <i className="fa-solid fa-plus mr-2 text-[9px]" />
                  Add staff
                </button>
              </div>
            </div>
          </section>

          <section className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Staff Management
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  System users
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {staff.length} staff account{staff.length === 1 ? '' : 's'} in total.
                </p>
              </div>

              {error && (
                <div className="mb-6 border-l-4 border-red-600 bg-red-50 px-4 py-4">
                  <p className="text-xs font-semibold text-red-800">Unable to complete request</p>
                  <p className="mt-1 text-xs text-red-700">{error}</p>
                </div>
              )}

              <div className="bg-white">
                <StaffTable
                  staff={paginatedStaff}
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

              {!loading && (
                <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-slate-400">
                    {staff.length > 0 ? (
                      <>
                        Showing{' '}
                        <span className="font-semibold text-slate-600">
                          {firstItem}–{lastItem}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-slate-600">
                          {staff.length}
                        </span>{' '}
                        staff member{staff.length === 1 ? '' : 's'}
                      </>
                    ) : (
                      'No staff accounts to display'
                    )}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() =>
                        setCurrentPage((current) =>
                          Math.max(1, current - 1),
                        )
                      }
                      className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="fa-solid fa-arrow-left mr-2 text-[9px]" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((current) =>
                          Math.min(
                            totalPages,
                            current + 1,
                          ),
                        )
                      }
                      className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      <Footer />

      <StaffFormModal
        open={formModal.open}
        mode={formModal.mode}
        initial={formModal.member}
        onDirtyChange={setFormDirty}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
      />

      <UnsavedChangesModal
        open={showUnsavedChangesModal}
        onKeepEditing={() => {
          setShowUnsavedChangesModal(false);
        }}
        onDiscard={() => {
          setShowUnsavedChangesModal(false);
          setFormDirty(false);

          setFormModal({
            open: false,
            mode: 'create',
            member: null,
          });
        }}
      />

      <ResetPasswordModal
        open={resetModal.open}
        member={resetModal.member}
        onClose={() =>
          setResetModal({
            open: false,
            member: null,
          })
        }
        onConfirm={handleResetConfirm}
      />

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-gray-900 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminStaffAccountsPage;