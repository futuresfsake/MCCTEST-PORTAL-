import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
  getTraineeFilterOptions,
  isRequestCancelled,
  listTrainees,
  requestErrorMessage,
} from '../../api/trainee-information.api';
import { EMPTY_FILTERS, useTraineeListQuery } from '../../hooks/useTraineeListQuery';
import type {
  TraineeInformationRole,
  TraineeFilterKey,
  TraineeFilterOptions,
  TraineeListResponse,
  TraineeSortField,
} from '../../types/trainee-information.type';
import ActiveFilterChips from './ActiveFilterChips';
import ListPagination from './ListPagination';
import TraineeFilterPanel from './TraineeFilterPanel';
import TraineeTable from './TraineeTable';

const SEARCH_DEBOUNCE_MS = 300;

/** Sorting a column first uses the order people expect for it. */
const DEFAULT_ORDER: Record<TraineeSortField, 'asc' | 'desc'> = { name: 'asc', idCard: 'asc', enrolledAt: 'desc' };

/** Location state the profile page reads to return to the same list view. */
export interface TraineeListLocationState {
  listSearch: string;
}

interface TraineeListViewProps {
  role: TraineeInformationRole;
  /** e.g. /admin/trainees; profiles open at `${basePath}/:id` */
  basePath: string;
}

/** Shared trainee list for every role that can view Trainee Information. */
const TraineeListView: React.FC<TraineeListViewProps> = ({ role, basePath }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { query, update } = useTraineeListQuery();

  const [result, setResult] = useState<TraineeListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [options, setOptions] = useState<TraineeFilterOptions | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // The search box updates the URL after a pause in typing. When the URL
  // search changes from elsewhere (chip removed, Back), the box follows it.
  const [searchText, setSearchText] = useState(query.search);
  const [syncedSearch, setSyncedSearch] = useState(query.search);
  if (query.search !== syncedSearch) {
    setSyncedSearch(query.search);
    if (searchText.trim() !== query.search) setSearchText(query.search);
  }

  useEffect(() => {
    const term = searchText.trim();
    if (term === query.search) return;
    const timer = window.setTimeout(() => update({ search: term }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchText, query.search, update]);

  // Each change cancels the request still in flight, so a slow, outdated
  // response can never replace a newer one.
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    listTrainees(role, query, controller.signal)
      .then((response) => {
        setResult(response);
        setError(null);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (isRequestCancelled(err)) return;
        setError(requestErrorMessage(err, 'Failed to load trainees.'));
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [role, query, reloadKey]);

  useEffect(() => {
    const controller = new AbortController();
    getTraineeFilterOptions(role, controller.signal)
      .then(setOptions)
      .catch((err: unknown) => {
        // The list still works without dropdown values; selects stay disabled
        if (!isRequestCancelled(err)) console.error('Error loading filter options:', err);
      });
    return () => controller.abort();
  }, [role]);

  // A link to a page that no longer exists (fewer results now) moves to the last page
  useEffect(() => {
    if (result && result.total > 0 && query.page > result.totalPages) {
      update({ page: result.totalPages }, { replace: true });
    }
  }, [result, query.page, update]);

  const activeFilterCount = (Object.keys(EMPTY_FILTERS) as TraineeFilterKey[]).filter(
    (key) => key !== 'search' && query[key] !== '',
  ).length;

  const openProfile = (traineeId: string) => {
    const state: TraineeListLocationState = { listSearch: location.search };
    navigate(`${basePath}/${traineeId}`, { state });
  };

  const handleSort = (field: TraineeSortField) => {
    const sortOrder = query.sortBy === field ? (query.sortOrder === 'asc' ? 'desc' : 'asc') : DEFAULT_ORDER[field];
    update({ sortBy: field, sortOrder });
  };

  const clearAll = () => {
    setSearchText('');
    update({ ...EMPTY_FILTERS });
  };

  const rows = result?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              maxLength={100}
              placeholder="Search name, username, email, contact, ID card, or OR number"
              aria-label="Search trainees"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((visible) => !visible)}
            aria-expanded={showFilters}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
          >
            <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-blue-900 px-2 py-0.5 text-[10px] font-semibold text-white">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <TraineeFilterPanel
            filters={query}
            options={options}
            onChange={(patch) => update(patch)}
            showInsurance={role !== 'trainer'}
          />
        )}

        <ActiveFilterChips filters={role === 'trainer' ? { ...query, insurance: '' } : query} options={options} onRemove={(patch) => update(patch)} onClearAll={clearAll} />
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-2 text-sm font-medium text-red-700 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : !result ? (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-900" />
            <p className="text-sm text-slate-600">Loading trainees...</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center">
          <p className="mb-3 text-slate-600">No trainees match your search and filters.</p>
          {(activeFilterCount > 0 || query.search) && (
            <button type="button" onClick={clearAll} className="text-sm font-medium text-blue-900 hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <TraineeTable
          rows={rows}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={handleSort}
          onOpen={openProfile}
          isLoading={isLoading}
        />
      )}

      {result && !error && (
        <ListPagination
          page={query.page}
          limit={query.limit}
          total={result.total}
          totalPages={result.totalPages}
          onPageChange={(page) => update({ page })}
          onLimitChange={(limit) => update({ limit })}
          disabled={isLoading}
        />
      )}
    </div>
  );
};

export default TraineeListView;
