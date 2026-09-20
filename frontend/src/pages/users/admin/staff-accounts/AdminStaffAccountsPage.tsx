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

const PAGE_SIZE = 5;

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

  // Helper to generate dynamic page numbers with ellipsis if there are many pages
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Header />

      {/* ── Main application area ──────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">
        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <Sidebar variant="admin" />

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main className="min-w-0 flex-1 bg-slate-50">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
              {/* ── Page header ───────────────────────────────────────── */}
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Administration
                  </p>

                  <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                    Staff accounts
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 md:text-base">
                    Manage registrar, trainer, and encoder accounts,
                    including their access status and password resets.
                  </p>
                </div>

                <button
                  onClick={handleCreate}
                  className="inline-flex shrink-0 items-center justify-center gap-2 bg-blue-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-950 active:bg-blue-950"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>

                  Add staff
                </button>
              </div>
            </div>
          </section>

          {/* ── Staff management ──────────────────────────────────────── */}
          <section className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
              {/* ── Fetch error ───────────────────────────────────────── */}
              {error && (
                <div className="mb-6 flex flex-col gap-2 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                  <span>{error}</span>

                  <button
                    onClick={fetchStaff}
                    className="self-start font-semibold underline underline-offset-2 hover:text-red-900 sm:self-auto"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* ── Staff table ────────────────────────────────────────── */}
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

              {/* ── Sequential Pagination Controls ────────────────────── */}
              {!loading && staff.length > 0 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:px-6 shadow-sm">
                  <div className="text-sm text-slate-700">
                    Showing <span className="font-medium">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * PAGE_SIZE, staff.length)}
                    </span>{' '}
                    of <span className="font-medium">{staff.length}</span> results
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex h-9 items-center justify-center border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>

                    {/* Sequential Page Numbers (Equal Sized W/H) */}
                    {getPageNumbers().map((page, index) => {
                      if (page === '...') {
                        return (
                          <span key={`ellipsis-${index}`} className="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400">
                            ...
                          </span>
                        );
                      }

                      const pageNum = page as number;
                      const isActive = currentPage === pageNum;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`inline-flex h-9 w-9 items-center justify-center border text-sm font-medium transition ${
                            isActive
                              ? 'border-blue-900 bg-blue-900 text-white shadow-sm'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="inline-flex h-9 items-center justify-center border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <Footer />

      {/* ── Modals ─────────────────────────────────────────────────────── */}
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

      {/* ── Toast ──────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'bg-gray-900 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg
              className="h-4 w-4 shrink-0 text-emerald-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 0 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
              />
            </svg>
          ) : (
            <svg
              className="h-4 w-4 shrink-0 text-red-200"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
              />
            </svg>
          )}

          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminStaffAccountsPage;