import { useCallback, useEffect, useMemo, useState } from 'react';
import { ListToolbar, type ListFilterChip } from '../common/ListToolbar';
import { Pagination } from '../common/Pagination';
import { useServerList } from '../../hooks/useServerList';
import {
  BULK_CHUNK_SIZE,
  bulkMarkReceived,
  getRequirementFilterOptions,
  getRequirements,
  type DocumentKey,
  type RequirementsRole,
  type RequirementFilterOptions,
  type RequirementListResponse,
} from '../../api/requirements.api';
import { RequirementChecklistPanel } from './RequirementChecklistPanel';
import { DOCUMENT_KEYS, DOCUMENT_LABELS, EDITABLE_DOCUMENT_KEYS } from './documents';

const DEFAULT_COMPLETION = 'incomplete';
const DEFAULT_STATUS = 'ENROLLED';
const DEFAULT_SORT = 'missing';
const DEFAULT_LIMIT = 20;

const SORT_LABELS: Record<string, string> = {
  missing: 'Most missing first',
  name: 'Trainee name',
  batchStart: 'Batch start date',
  lastChecked: 'Last checked',
};

const COMPLETION_LABELS: Record<string, string> = {
  all: 'All',
  complete: 'Complete',
  incomplete: 'Incomplete',
};

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function RequirementsListPage({ role }: { role: RequirementsRole }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [options, setOptions] = useState<RequirementFilterOptions | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkDocument, setBulkDocument] = useState<DocumentKey>('two_by_two_pic');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const loadRequirements = useCallback(
    (params: URLSearchParams, signal: AbortSignal) => {
      const query = new URLSearchParams();
      for (const [key, value] of params.entries()) {
        if (key !== 'page' && key !== 'limit') query.append(key, value);
      }
      const limit = Number(params.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;
      const page = Number(params.get('page') ?? '1') || 1;
      query.set('take', String(limit));
      query.set('skip', String((page - 1) * limit));
      return getRequirements(role, query, signal);
    },
    [role],
  );

  const { searchParams, setSearchParams, data, loading, error } =
    useServerList<RequirementListResponse>(loadRequirements, 300, refreshKey);

  useEffect(() => {
    getRequirementFilterOptions(role).then(setOptions).catch(() => setOptions(null));
  }, [role]);

  // A new page, filter or refresh invalidates the row selection.
  const paramsKey = searchParams.toString();
  useEffect(() => {
    setSelected(new Set());
  }, [paramsKey, refreshKey]);

  const search = searchParams.get('search') ?? '';
  const completion = searchParams.get('completion') ?? DEFAULT_COMPLETION;
  const missingFilter = searchParams.getAll('missing');
  const statusFilter = searchParams.getAll('status');
  const programId = searchParams.get('programId') ?? '';
  const batchId = searchParams.get('batchId') ?? '';
  const sort = searchParams.get('sort') ?? DEFAULT_SORT;
  const page = Number(searchParams.get('page') ?? '1') || 1;
  const limit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT) || DEFAULT_LIMIT;

  const update = (changes: Record<string, string | string[] | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      next.delete(key);
      if (Array.isArray(value)) value.forEach((item) => next.append(key, item));
      else if (value) next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setSearchParams(next);
  };

  const setPage = (nextPage: number) => update({ page: nextPage > 1 ? String(nextPage) : null });

  const programName = options?.programs.find((p) => p.id === programId)?.name ?? programId;
  const batchName = options?.batches.find((b) => b.id === batchId)?.name ?? batchId;
  const visibleBatches = (options?.batches ?? []).filter((b) => !programId || b.programId === programId);

  const chips: ListFilterChip[] = [];
  if (completion !== DEFAULT_COMPLETION) {
    chips.push({ key: 'completion', label: 'Completion', value: COMPLETION_LABELS[completion] ?? completion });
  }
  missingFilter.forEach((doc) =>
    chips.push({ key: `missing:${doc}`, label: 'Missing', value: DOCUMENT_LABELS[doc as DocumentKey] ?? doc }),
  );
  if (programId) chips.push({ key: 'programId', label: 'Program', value: programName });
  if (batchId) chips.push({ key: 'batchId', label: 'Batch', value: batchName });
  if (statusFilter.length > 0 && !(statusFilter.length === 1 && statusFilter[0] === DEFAULT_STATUS)) {
    chips.push({ key: 'status', label: 'Status', value: statusFilter.join(', ') });
  }
  if (sort !== DEFAULT_SORT) chips.push({ key: 'sort', label: 'Sort', value: SORT_LABELS[sort] ?? sort });

  const removeChip = (key: string) => {
    if (key.startsWith('missing:')) {
      update({ missing: missingFilter.filter((doc) => `missing:${doc}` !== key) });
    } else if (key === 'programId') {
      update({ programId: null, batchId: null });
    } else {
      update({ [key]: null });
    }
  };

  const toggleMissing = (doc: DocumentKey) =>
    update({ missing: missingFilter.includes(doc) ? missingFilter.filter((d) => d !== doc) : [...missingFilter, doc] });

  const toggleStatus = (status: string) => {
    const current = statusFilter.length > 0 ? statusFilter : [DEFAULT_STATUS];
    const next = current.includes(status) ? current.filter((s) => s !== status) : [...current, status];
    update({ status: next.length === 0 || (next.length === 1 && next[0] === DEFAULT_STATUS) ? null : next });
  };

  const rows = useMemo(() => data?.data ?? [], [data]);
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.enrollmentId));

  const toggleRow = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const runBulk = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    setNotice(null);
    let updated = 0;
    try {
      for (let index = 0; index < ids.length; index += BULK_CHUNK_SIZE) {
        const result = await bulkMarkReceived(role, ids.slice(index, index + BULK_CHUNK_SIZE), bulkDocument);
        updated += result.updated;
      }
      setNotice({
        kind: 'ok',
        text: `${DOCUMENT_LABELS[bulkDocument]} marked received for ${updated} of ${ids.length} selected.`,
      });
    } catch (bulkError) {
      setNotice({
        kind: 'error',
        text: `${bulkError instanceof Error ? bulkError.message : 'Bulk update failed'}${updated > 0 ? ` (${updated} rows were already updated in earlier groups of ${BULK_CHUNK_SIZE}.)` : ''}`,
      });
    } finally {
      setBulkBusy(false);
      setRefreshKey((key) => key + 1);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / limit));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Requirements</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track missing documents and update a trainee&apos;s checklist at any time.
        </p>
      </div>

      <ListToolbar
        search={search}
        searchPlaceholder="Search name, username or ID card number"
        filters={chips}
        onSearch={(value) => update({ search: value || null })}
        onRemoveFilter={removeChip}
        onClearAll={() => setSearchParams(new URLSearchParams())}
      />

      <div className="grid gap-3 border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600">
          Completion
          <select
            value={completion}
            onChange={(event) => update({ completion: event.target.value === DEFAULT_COMPLETION ? null : event.target.value })}
            className="mt-1 w-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
          >
            {Object.entries(COMPLETION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Program
          <select
            value={programId}
            onChange={(event) => update({ programId: event.target.value || null, batchId: null })}
            className="mt-1 w-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
          >
            <option value="">All programs</option>
            {(options?.programs ?? []).map((program) => (
              <option key={program.id} value={program.id}>{program.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Batch
          <select
            value={batchId}
            onChange={(event) => update({ batchId: event.target.value || null })}
            className="mt-1 w-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
          >
            <option value="">All batches</option>
            {visibleBatches.map((batch) => (
              <option key={batch.id} value={batch.id}>{batch.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-600">
          Sort by
          <select
            value={sort}
            onChange={(event) => update({ sort: event.target.value === DEFAULT_SORT ? null : event.target.value })}
            className="mt-1 w-full border border-slate-200 bg-slate-50 px-2 py-2 text-sm"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <fieldset className="sm:col-span-2">
          <legend className="text-xs font-semibold text-slate-600">Enrollment status</legend>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {(options?.statuses ?? [DEFAULT_STATUS]).map((status) => {
              const active = (statusFilter.length > 0 ? statusFilter : [DEFAULT_STATUS]).includes(status);
              return (
                <label key={status} className="flex items-center gap-1.5">
                  <input type="checkbox" checked={active} onChange={() => toggleStatus(status)} />
                  {status}
                </label>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="sm:col-span-2 lg:col-span-4">
          <legend className="text-xs font-semibold text-slate-600">Missing document</legend>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {DOCUMENT_KEYS.map((doc) => (
              <label key={doc} className="flex items-center gap-1.5">
                <input type="checkbox" checked={missingFilter.includes(doc)} onChange={() => toggleMissing(doc)} />
                {DOCUMENT_LABELS[doc]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span>
          <span className="font-semibold text-amber-700">{data?.counts.incomplete ?? 0}</span> incomplete
        </span>
        <span>
          <span className="font-semibold text-emerald-700">{data?.counts.complete ?? 0}</span> complete
        </span>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <span className="font-semibold text-blue-900">{selected.size} selected</span>
          <label className="flex items-center gap-2">
            Mark received:
            <select
              value={bulkDocument}
              onChange={(event) => setBulkDocument(event.target.value as DocumentKey)}
              className="border border-slate-200 bg-white px-2 py-1.5"
            >
              {EDITABLE_DOCUMENT_KEYS.map((doc) => (
                <option key={doc} value={doc}>{DOCUMENT_LABELS[doc]}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void runBulk()}
            disabled={bulkBusy}
            className="bg-blue-900 px-3 py-1.5 font-semibold text-white disabled:opacity-50"
          >
            {bulkBusy ? 'Updating…' : 'Apply to selected'}
          </button>
          <button type="button" onClick={() => setSelected(new Set())} className="underline">
            Clear selection
          </button>
        </div>
      ) : null}

      {notice ? (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
        >
          {notice.text}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={allSelected}
                  onChange={() =>
                    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.enrollmentId)))
                  }
                />
              </th>
              <th className="px-3 py-3">Trainee</th>
              <th className="px-3 py-3">ID card</th>
              <th className="px-3 py-3">Program / Batch</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Progress</th>
              <th className="px-3 py-3">Missing</th>
              <th className="px-3 py-3">Last checked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Loading…</td></tr>
            ) : null}
            {!loading && rows.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">No enrollments match these filters.</td></tr>
            ) : null}
            {rows.map((row) => (
              <tr
                key={row.enrollmentId}
                onClick={() => setOpenId(row.enrollmentId)}
                className="cursor-pointer hover:bg-slate-50"
              >
                <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.traineeName}`}
                    checked={selected.has(row.enrollmentId)}
                    onChange={() => toggleRow(row.enrollmentId)}
                  />
                </td>
                <td className="px-3 py-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenId(row.enrollmentId);
                    }}
                    className="text-left font-semibold text-slate-900 hover:underline"
                  >
                    {row.traineeName}
                  </button>
                  <span className="block text-xs text-slate-500">{row.systemId ?? ''}</span>
                </td>
                <td className="px-3 py-3 text-slate-700">{row.idCardNumber ?? '—'}</td>
                <td className="px-3 py-3 text-slate-700">
                  {row.program.name}
                  <span className="block text-xs text-slate-500">{row.batch.name}</span>
                </td>
                <td className="px-3 py-3 text-slate-700">{row.enrollmentStatus}</td>
                <td className="px-3 py-3 font-medium text-slate-900">
                  {row.submitted} / {row.total} submitted
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.missing.length === 0 ? (
                      <span className="bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Complete</span>
                    ) : (
                      row.missing.map((doc) => (
                        <span key={doc} className="bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          {DOCUMENT_LABELS[doc]}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700">
                  {row.checkedBy ?? '—'}
                  <span className="block text-xs text-slate-500">{formatDate(row.checkedAt)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        limit={limit}
        total={data?.total ?? 0}
        totalPages={totalPages}
        onPageChange={setPage}
        onLimitChange={(nextLimit) =>
          update({ limit: nextLimit === DEFAULT_LIMIT ? null : String(nextLimit), page: null })
        }
      />

      {openId ? (
        <RequirementChecklistPanel
          role={role}
          enrollmentId={openId}
          onClose={() => setOpenId(null)}
          onSaved={() => setRefreshKey((key) => key + 1)}
        />
      ) : null}
    </div>
  );
}
