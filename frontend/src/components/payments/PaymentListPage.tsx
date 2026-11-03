import { useCallback, useEffect, useState, useRef } from 'react';
import { getPaymentDetail, getPaymentFilterOptions, getPayments, type PaymentListQuery, type PaymentListResponse } from '../../api/payments.api';
import { ListToolbar, type ListFilterChip } from '../common/ListToolbar';
import { Pagination } from '../common/Pagination';
import { useServerList } from '../../hooks/useServerList';

const reasonLabels: Record<string, string> = {
  PROCESSING_FEE: 'Processing Fee',
  UNIFORM_ID_FEE: 'Uniform/ID Fee',
  ASSESSMENT_DEPOSIT: 'Assessment Deposit',
  EXTERNAL_FEES: 'External Fees',
};

const reasonIcons: Record<string, string> = {
  PROCESSING_FEE: 'fa-solid fa-file-invoice',
  UNIFORM_ID_FEE: 'fa-solid fa-id-card',
  ASSESSMENT_DEPOSIT: 'fa-solid fa-clipboard-check',
  EXTERNAL_FEES: 'fa-solid fa-arrow-up-right-from-square',
};

function formatCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function ReceiptDrawer({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const amountDue = Number(receipt.base_fee ?? 0);
  const amountPaid = Number(receipt.amount ?? 0);
  const balance = amountDue - amountPaid;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Receipt detail">
      <div className="absolute inset-0 bg-slate-950/40 transition-opacity" onClick={onClose} />
      <div ref={drawerRef} className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center bg-blue-50">
              <i className="fa-solid fa-receipt text-sm text-blue-900" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Official Receipt</p>
              <p className="text-lg font-bold text-slate-900">{receipt.or_number}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 border border-slate-200 bg-gradient-to-br from-blue-50/50 to-slate-50 p-5">
            <div className="mb-4 flex items-center gap-2">
              <i className="fa-solid fa-user text-xs text-blue-900" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Trainee</p>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {receipt.trainee ? `${receipt.trainee.first_name} ${receipt.trainee.last_name}` : '—'}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span><i className="fa-solid fa-graduation-cap mr-1.5 text-slate-400" />{receipt.program?.name ?? '—'}</span>
              <span><i className="fa-solid fa-layer-group mr-1.5 text-slate-400" />{receipt.batch?.batch_name ?? '—'}</span>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3">
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Amount Due</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(receipt.base_fee)}</p>
            </div>
            <div className="border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Amount Paid</p>
              <p className="mt-2 text-xl font-bold text-emerald-700">{formatCurrency(receipt.amount)}</p>
            </div>
          </div>

          {balance > 0 ? (
            <div className="mb-6 flex items-center gap-3 border border-amber-200 bg-amber-50 px-4 py-3">
              <i className="fa-solid fa-triangle-exclamation text-sm text-amber-600" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Underpayment</p>
                <p className="text-xs text-amber-700">Remaining balance: {formatCurrency(balance)}</p>
              </div>
            </div>
          ) : balance < 0 ? (
            <div className="mb-6 flex items-center gap-3 border border-blue-200 bg-blue-50 px-4 py-3">
              <i className="fa-solid fa-circle-info text-sm text-blue-600" />
              <div>
                <p className="text-xs font-semibold text-blue-800">Overpayment</p>
                <p className="text-xs text-blue-700">Excess: {formatCurrency(Math.abs(balance))}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-0 divide-y divide-slate-100">
            <DetailRow icon="fa-solid fa-tag" label="Reason" value={reasonLabels[receipt.reason_of_dues] ?? receipt.reason_of_dues} />
            <DetailRow icon="fa-solid fa-credit-card" label="Payment Method" value={receipt.payment_method ?? '—'} />
            <DetailRow icon="fa-solid fa-calendar" label="Payment Date" value={formatDate(receipt.payment_date)} />
            <DetailRow icon="fa-solid fa-user-check" label="Confirmed by" value={receipt.confirmed_by_name ?? '—'} />
            <DetailRow icon="fa-solid fa-message" label="Remarks" value={receipt.remarks || '—'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3.5">
      <i className={`${icon} mt-0.5 w-4 text-center text-xs text-slate-400`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, accent }: { icon: string; label: string; value: string; subtext?: string; accent?: 'blue' | 'emerald' | 'slate' }) {
  const accentMap = {
    blue: 'border-l-blue-900 bg-blue-50 text-blue-900',
    emerald: 'border-l-emerald-600 bg-emerald-50 text-emerald-700',
    slate: 'border-l-slate-400 bg-slate-50 text-slate-600',
  };
  const cls = accentMap[accent ?? 'blue'];
  return (
    <div className={`border border-slate-200 border-l-4 bg-white p-5 ${cls.split(' ')[0]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">{label}</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${cls.split(' ').slice(2).join(' ')}`}>{value}</p>
          {subtext ? <p className="mt-1.5 text-xs text-slate-400">{subtext}</p> : null}
        </div>
        <div className={`flex h-9 w-9 items-center justify-center ${cls.split(' ')[1]}`}>
          <i className={`${icon} text-sm ${cls.split(' ').slice(2).join(' ')}`} />
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function CheckboxDropdown({ labelId, label, summary, options, selected, onToggle }: {
  labelId: string;
  label: string;
  summary: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <FilterDropdown id={labelId} label={label}>
      <details aria-labelledby={labelId} className="relative border border-slate-200 bg-white text-sm text-slate-700">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-sm">
          <span className={selected.length ? 'font-medium text-slate-900' : 'text-slate-400'}>{summary}</span>
          <i className="fa-solid fa-chevron-down text-[9px] text-slate-400" />
        </summary>
        <div className="absolute left-0 top-full z-20 mt-1 max-h-56 min-w-full overflow-auto border border-slate-200 bg-white p-1.5 shadow-lg">
          {options.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-sm transition hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onToggle(option.value)}
                className="h-3.5 w-3.5 accent-blue-900"
              />
              <span className="text-slate-700">{option.label}</span>
            </label>
          ))}
          {options.length === 0 ? <p className="px-2.5 py-2 text-xs text-slate-400">No options available</p> : null}
        </div>
      </details>
    </FilterDropdown>
  );
}

export function PaymentListPage({ role, onRecordPayment, refreshKey = 0 }: { role: 'admin' | 'registrar'; onRecordPayment?: () => void; refreshKey?: number }) {
  const [showFilters, setShowFilters] = useState(false);

  const loadPayments = useCallback((params: URLSearchParams, signal: AbortSignal) => {
    const query: PaymentListQuery = {
      search: params.get('search') ?? '',
      reason: params.getAll('reason'),
      paymentMethod: params.getAll('paymentMethod'),
      programId: params.get('programId') ?? '',
      batchId: params.get('batchId') ?? '',
      confirmedBy: params.get('confirmedBy') ?? '',
      fromDate: params.get('fromDate') ?? '',
      toDate: params.get('toDate') ?? '',
      page: Number(params.get('page') ?? '1') || 1,
      limit: Number(params.get('limit') ?? '20') || 20,
      sortBy: (params.get('sortBy') ?? 'payment_date') as PaymentListQuery['sortBy'],
      sortOrder: (params.get('sortOrder') ?? 'desc') as PaymentListQuery['sortOrder'],
    };
    return getPayments(role, query, signal);
  }, [role]);

  const {
    searchParams,
    setSearchParams,
    data: listData,
    loading,
    error: listError,
  } = useServerList<PaymentListResponse>(loadPayments, 300, refreshKey);

  const rows = listData?.data ?? [];
  const meta = listData?.meta ?? { page: 1, limit: 20, total: 0, totalPages: 1 };
  const totals = listData?.totals ?? { count: 0, totalAmount: '0.00' };

  const queryState = {
    search: searchParams.get('search') ?? '',
    reason: searchParams.getAll('reason'),
    paymentMethod: searchParams.getAll('paymentMethod'),
    programId: searchParams.get('programId') ?? '',
    batchId: searchParams.get('batchId') ?? '',
    confirmedBy: searchParams.get('confirmedBy') ?? '',
    fromDate: searchParams.get('fromDate') ?? '',
    toDate: searchParams.get('toDate') ?? '',
    page: Number(searchParams.get('page') ?? '1') || 1,
    limit: Number(searchParams.get('limit') ?? '20') || 20,
    sortBy: searchParams.get('sortBy') ?? 'payment_date',
    sortOrder: searchParams.get('sortOrder') ?? 'desc',
  };

  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<any>({
    programs: [],
    batches: [],
    staff: [],
    paymentMethods: [],
    paymentReasons: [],
  });
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeFilters: ListFilterChip[] = [];
  if (queryState.search) activeFilters.push({ key: 'search', label: 'Search', value: queryState.search });
  queryState.reason.forEach((value) => activeFilters.push({ key: `reason:${value}`, label: 'Reason', value: reasonLabels[value] ?? value }));
  queryState.paymentMethod.forEach((value) => activeFilters.push({ key: `paymentMethod:${value}`, label: 'Method', value }));
  if (queryState.programId) activeFilters.push({ key: 'programId', label: 'Program', value: queryState.programId });
  if (queryState.batchId) activeFilters.push({ key: 'batchId', label: 'Batch', value: queryState.batchId });
  if (queryState.confirmedBy) activeFilters.push({ key: 'confirmedBy', label: 'Confirmed by', value: queryState.confirmedBy });
  if (queryState.fromDate) activeFilters.push({ key: 'fromDate', label: 'From', value: queryState.fromDate });
  if (queryState.toDate) activeFilters.push({ key: 'toDate', label: 'To', value: queryState.toDate });

  const hasActiveFilters = activeFilters.length > 0;

  const selectedProgramBatches = (() => {
    if (!queryState.programId) return filterOptions.batches ?? [];
    return (filterOptions.batches ?? []).filter((item: any) => item.program_id === queryState.programId);
  })();

  useEffect(() => {
    const fetchOptions = async () => {
      const data = await getPaymentFilterOptions(role);
      setFilterOptions(data);
    };
    fetchOptions().catch((error: unknown) => {
      setOptionsError(error instanceof Error ? error.message : 'Unable to load payment filters');
    });
  }, [role]);

  const updateQuery = (patch: Record<string, string | string[] | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        next.delete(key);
        return;
      }
      if (Array.isArray(value)) {
        next.delete(key);
        value.forEach((item) => next.append(key, item));
        return;
      }
      next.set(key, String(value));
    });
    next.set('page', patch.page === undefined ? '1' : String(patch.page));
    setSearchParams(next);
  };

  const removeFilter = (key: string) => {
    const next = new URLSearchParams(searchParams);
    if (key === 'search') next.delete('search');
    if (key.startsWith('reason:')) {
      const value = key.slice('reason:'.length);
      const values = next.getAll('reason');
      next.delete('reason');
      values.filter((item) => item !== value).forEach((item) => next.append('reason', item));
    }
    if (key.startsWith('paymentMethod:')) {
      const value = key.split(':')[1];
      const values = next.getAll('paymentMethod');
      next.delete('paymentMethod');
      values.filter((item) => item !== value).forEach((item) => next.append('paymentMethod', item));
    }
    if (key === 'programId') next.delete('programId');
    if (key === 'batchId') next.delete('batchId');
    if (key === 'confirmedBy') next.delete('confirmedBy');
    if (key === 'fromDate') next.delete('fromDate');
    if (key === 'toDate') next.delete('toDate');
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  const toggleMultiFilter = (key: 'reason' | 'paymentMethod', value: string) => {
    const values = searchParams.getAll(key);
    const nextValues = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];
    updateQuery({ [key]: nextValues });
  };

  const setSort = (sortBy: 'payment_date' | 'amount' | 'or_number') => {
    const sortOrder = queryState.sortBy === sortBy && queryState.sortOrder === 'desc' ? 'asc' : 'desc';
    updateQuery({ sortBy, sortOrder });
  };

  async function openReceipt(id: string) {
    const detail = await getPaymentDetail(role, id);
    setSelectedReceipt(detail);
    setDrawerOpen(true);
  }

  const tableHeaders: { label: string; key: string; sortKey?: 'or_number' | 'amount' | 'payment_date'; align?: 'right' }[] = [
    { label: 'OR Number', key: 'or_number', sortKey: 'or_number' },
    { label: 'Trainee', key: 'trainee' },
    { label: 'Program', key: 'program' },
    { label: 'Reason', key: 'reason_of_dues' },
    { label: 'Amount', key: 'amount', sortKey: 'amount', align: 'right' },
    { label: 'Date', key: 'payment_date', sortKey: 'payment_date' },
    { label: 'Confirmed by', key: 'confirmed_by_name' },
  ];

  const avgPayment = totals.count > 0 ? Number(totals.totalAmount) / totals.count : 0;

  return (
    <div className="text-slate-900">
      {/* ── Header bar ── */}
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
            Finance
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Payment Records
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            View, search, and record official receipts for all trainee payments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRecordPayment?.()}
          className="group flex items-center gap-2 bg-blue-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          <i className="fa-solid fa-plus text-xs transition group-hover:rotate-90" />
          Record Payment
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon="fa-solid fa-receipt"
          label="Total receipts"
          value={totals.count.toLocaleString()}
          subtext={`${meta.totalPages} page${meta.totalPages !== 1 ? 's' : ''}`}
          accent="blue"
        />
        <StatCard
          icon="fa-solid fa-peso-sign"
          label="Total collected"
          value={formatCurrency(totals.totalAmount)}
          subtext="Across all filtered records"
          accent="emerald"
        />
        <StatCard
          icon="fa-solid fa-chart-simple"
          label="Average payment"
          value={formatCurrency(avgPayment)}
          subtext="Per receipt"
          accent="slate"
        />
      </div>

      {/* ── Search + Filters ── */}
      <div className="mb-6 border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-filter text-xs text-slate-400" />
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Search & Filter</p>
            {hasActiveFilters ? (
              <span className="flex h-5 min-w-[20px] items-center justify-center bg-blue-900 px-1.5 text-[10px] font-bold text-white">
                {activeFilters.length}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-xs font-semibold text-blue-900 transition hover:text-blue-950"
          >
            {showFilters ? 'Hide' : 'Show'} filters
            <i className={`fa-solid fa-chevron-${showFilters ? 'up' : 'down'} text-[9px]`} />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <ListToolbar
            search={queryState.search}
            searchPlaceholder="Search by OR number, trainee name, or username..."
            filters={activeFilters}
            onSearch={(search) => updateQuery({ search })}
            onRemoveFilter={removeFilter}
            onClearAll={clearAll}
          />

          {showFilters ? (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <CheckboxDropdown
                  labelId="payment-reason-label"
                  label="Reason of dues"
                  summary={queryState.reason.length ? `${queryState.reason.length} selected` : 'All reasons'}
                  options={filterOptions.paymentReasons}
                  selected={queryState.reason}
                  onToggle={(val) => toggleMultiFilter('reason', val)}
                />

                <CheckboxDropdown
                  labelId="payment-method-label"
                  label="Payment method"
                  summary={queryState.paymentMethod.length ? `${queryState.paymentMethod.length} selected` : 'All methods'}
                  options={filterOptions.paymentMethods}
                  selected={queryState.paymentMethod}
                  onToggle={(val) => toggleMultiFilter('paymentMethod', val)}
                />

                <FilterDropdown id="payment-date-from" label="Date from">
                  <input
                    id="payment-date-from"
                    type="date"
                    value={queryState.fromDate}
                    onChange={(e) => updateQuery({ fromDate: e.target.value })}
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900/10"
                  />
                </FilterDropdown>

                <FilterDropdown id="payment-date-to" label="Date to">
                  <input
                    id="payment-date-to"
                    type="date"
                    value={queryState.toDate}
                    onChange={(e) => updateQuery({ toDate: e.target.value })}
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900/10"
                  />
                </FilterDropdown>

                <FilterDropdown id="payment-program" label="Program">
                  <select
                    id="payment-program"
                    value={queryState.programId}
                    onChange={(e) => updateQuery({ programId: e.target.value, batchId: '' })}
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900/10"
                  >
                    <option value="">All programs</option>
                    {filterOptions.programs.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </FilterDropdown>

                <FilterDropdown id="payment-batch" label="Batch">
                  <select
                    id="payment-batch"
                    value={queryState.batchId}
                    onChange={(e) => updateQuery({ batchId: e.target.value })}
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900/10"
                  >
                    <option value="">All batches</option>
                    {selectedProgramBatches.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.batch_name}</option>
                    ))}
                  </select>
                </FilterDropdown>

                <FilterDropdown id="payment-confirmed-by" label="Confirmed by">
                  <select
                    id="payment-confirmed-by"
                    value={queryState.confirmedBy}
                    onChange={(e) => updateQuery({ confirmedBy: e.target.value })}
                    className="w-full border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900/10"
                  >
                    <option value="">Any staff</option>
                    {filterOptions.staff.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </FilterDropdown>
              </div>
            </div>
          ) : null}
        </div>

        {optionsError ? (
          <div className="mx-5 mb-4 flex items-center gap-2.5 border border-red-200 bg-red-50 px-4 py-2.5">
            <i className="fa-solid fa-circle-exclamation text-xs text-red-500" />
            <p className="text-sm text-red-700">{optionsError}</p>
          </div>
        ) : null}
        {listError ? (
          <div className="mx-5 mb-4 flex items-center gap-2.5 border border-red-200 bg-red-50 px-4 py-2.5">
            <i className="fa-solid fa-circle-exclamation text-xs text-red-500" />
            <p className="text-sm text-red-700">{listError}</p>
          </div>
        ) : null}
      </div>

      {/* ── Table ── */}
      <div className="overflow-hidden border border-slate-200 bg-white">
        {loading && rows.length > 0 ? (
          <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" />
            <p className="text-xs font-medium text-blue-900">Updating results...</p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {tableHeaders.map((header) => (
                  <th
                    key={header.key}
                    className={`px-4 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 ${header.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {header.sortKey ? (
                      <button
                        type="button"
                        onClick={() => setSort(header.sortKey!)}
                        className="group flex items-center gap-1.5 transition hover:text-blue-900"
                      >
                        {header.label}
                        <span className={`text-[9px] ${queryState.sortBy === header.sortKey ? 'text-blue-900' : 'text-slate-300 group-hover:text-slate-400'}`}>
                          {queryState.sortBy === header.sortKey
                            ? (queryState.sortOrder === 'asc' ? <i className="fa-solid fa-arrow-up" /> : <i className="fa-solid fa-arrow-down" />)
                            : <i className="fa-solid fa-sort" />
                          }
                        </span>
                      </button>
                    ) : header.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 && loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-900 border-t-transparent" />
                      <p className="text-sm text-slate-500">Loading payment records...</p>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center bg-slate-100">
                        <i className="fa-solid fa-receipt text-xl text-slate-300" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">No receipts found</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {hasActiveFilters ? 'Try adjusting your search or filters.' : 'No payment records have been created yet.'}
                        </p>
                      </div>
                      {hasActiveFilters ? (
                        <button type="button" onClick={clearAll} className="mt-1 text-xs font-semibold text-blue-900 transition hover:text-blue-950">
                          Clear all filters
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50/80">
                    <td className="px-4 py-3.5">
                      <button type="button" onClick={() => openReceipt(row.id)} className="group flex items-center gap-2 text-left">
                        <span className="flex h-7 w-7 items-center justify-center bg-blue-50 transition group-hover:bg-blue-100">
                          <i className="fa-solid fa-receipt text-[10px] text-blue-900" />
                        </span>
                        <span className="font-semibold text-blue-900 underline decoration-blue-200 underline-offset-2 transition group-hover:decoration-blue-900">{row.or_number}</span>
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      {row.trainee ? (
                        <div>
                          <p className="font-medium text-slate-900">{row.trainee.first_name} {row.trainee.last_name}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600">{row.program?.name ?? <span className="text-slate-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                        <i className={`${reasonIcons[row.reason_of_dues] ?? 'fa-solid fa-tag'} text-[10px] text-slate-400`} />
                        {reasonLabels[row.reason_of_dues] ?? row.reason_of_dues}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(row.amount)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-slate-600">{formatDate(row.payment_date)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {row.confirmed_by_name ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                          <i className="fa-solid fa-user-check text-[10px] text-slate-400" />
                          {row.confirmed_by_name}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="mt-5">
        <Pagination
          page={queryState.page}
          limit={queryState.limit}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={(page) => updateQuery({ page })}
          onLimitChange={(limit) => updateQuery({ limit })}
        />
      </div>

      {/* ── Receipt drawer ── */}
      {drawerOpen && selectedReceipt ? (
        <ReceiptDrawer receipt={selectedReceipt} onClose={() => setDrawerOpen(false)} />
      ) : null}
    </div>
  );
}
