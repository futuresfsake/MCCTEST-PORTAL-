import { useEffect, useState } from 'react';
import { authHeaders, apiFetch } from '../../../../api/auth.api';
import Header from '../../../../components/layout/Header';
import Sidebar from '../../../../components/layout/Sidebar';
import Footer from '../../../../components/layout/Footer';
import { BatchTable } from '../../../../components/registrar/batches/BatchTable';
import type { BatchRow } from '../../../../components/registrar/batches/BatchTable';
import { BatchFormModal } from '../../../../components/registrar/batches/BatchFormModal';
import { BatchDetailDrawer } from '../../../../components/registrar/batches/BatchDetailDrawer';
import type { BatchDetail } from '../../../../components/registrar/batches/BatchDetailDrawer';
import type { BatchStatus } from '../../../../components/registrar/batches/BatchStatusBadge';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Program {
  id: string;
  name: string;
  program_code: string;
}

interface Trainer {
  id: string;
  full_name: string;
}

interface FormData {
  program_id: string;
  trainer_id?: string;
  batch_name: string;
  capacity: string;
  start_date: string;
  end_date: string;
  remarks: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: BatchStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Ongoing', value: 'ONGOING' },
  { label: 'Closed', value: 'CLOSED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const PAGE_SIZE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

function BatchManagement() {
  // Data
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchBatches();
    fetchDropdownData();
  }, []);

  async function fetchBatches() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/registrar/batches', {
        headers: authHeaders(),
      });
      const data = await res.json();
      setBatches(data);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDropdownData() {
    try {
      const res = await apiFetch('/api/registrar/batches/dropdown-data', {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to fetch batch dropdown data');
      }

      const data = await res.json();

      setPrograms(data.programs);
      setTrainers(data.trainers);
    } catch (err) {
      console.error('Failed to fetch batch dropdown data', err);
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleView(batch: BatchRow) {
    setSelectedBatch(batch);
    setDrawerOpen(true);
  }

  function handleEdit(batch: BatchRow) {
    setEditingBatch(batch);
    setDrawerOpen(false);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingBatch(null);
    setModalOpen(true);
  }

  async function handleSubmit(data: FormData) {
    const url = editingBatch ? `/api/registrar/batches/${editingBatch.id}` : '/api/registrar/batches';
    const method = editingBatch ? 'PATCH' : 'POST';

    const res = await apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        capacity: Number(data.capacity),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.message ?? 'Request failed');
    }

    await fetchBatches();
  }

  // ── Filtered list & Pagination Computed Values ──────────────────────────────

  const filtered = batches.filter((b) => {
    const matchesSearch =
      !search ||
      b.batch_name.toLowerCase().includes(search.toLowerCase()) ||
      b.program?.name.toLowerCase().includes(search.toLowerCase()) ||
      b.trainer?.full_name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || b.batch_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedBatches = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const firstItem = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, filtered.length);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />

      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="registrar" />

        <main className="min-w-0 flex-1">
          {/* Page Intro */}
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
              <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
                <div>
                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Registrar Operations
                  </p>
                  <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                    Batch Management
                  </h1>
                  <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                    Create and manage training batches across all programs, schedules, and assigned trainers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreate}
                  className="shrink-0 bg-blue-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-950"
                >
                  <i className="fa-solid fa-plus mr-2 text-[9px]" />
                  New batch
                </button>
              </div>
            </div>
          </section>

          {/* Batch Management Section */}
          <section className="border-b border-slate-200 bg-slate-50">
            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
              <div className="mb-8">
                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Batch Listing
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Available batches
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {filtered.length} batch{filtered.length === 1 ? '' : 'es'} in the system.
                </p>
              </div>

              {/* Filters */}
              <div className="mb-6 flex flex-col gap-3 border-y border-slate-200 bg-white p-4 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search batches by name, program, or trainer…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-slate-200 py-2.5 pl-9 pr-3 text-xs outline-none transition focus:border-blue-900"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={`border px-3 py-2 text-xs font-semibold transition ${
                        statusFilter === f.value
                          ? 'border-blue-900 bg-blue-900 text-white shadow-sm'
                          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white">
                <BatchTable
                  batches={paginatedBatches}
                  loading={loading}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  onView={handleView}
                  onEdit={handleEdit}
                />
              </div>

              {/* Pagination */}
              {!loading && (
                <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <p className="text-xs text-slate-400">
                    {filtered.length > 0 ? (
                      <>
                        Showing{' '}
                        <span className="font-semibold text-slate-600">
                          {firstItem}–{lastItem}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-slate-600">
                          {filtered.length}
                        </span>{' '}
                        batch{filtered.length === 1 ? '' : 'es'}
                      </>
                    ) : (
                      'No batches to display'
                    )}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="fa-solid fa-arrow-left mr-2 text-[9px]" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
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

      {/* Detail drawer */}
      <BatchDetailDrawer
        open={drawerOpen}
        batch={selectedBatch}
        onClose={() => setDrawerOpen(false)}
        onEdit={handleEdit}
      />

      {/* Create / Edit modal */}
      <BatchFormModal
        open={modalOpen}
        batch={editingBatch}
        programs={programs}
        trainers={trainers}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

export default BatchManagement;