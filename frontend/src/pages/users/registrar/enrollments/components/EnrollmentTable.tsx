import React, { useEffect, useState } from 'react';
import { getEnrollments, getPrograms } from '../../../../../api/users/registrar.api';
import EnrollmentStatusBadge from './EnrollmentStatusBadge';
import type { EnrollmentRecord, Program } from '../../../../../types/enrollment.type';

interface EnrollmentTableProps {
  onSelectEnrollment: (enrollmentId: string) => void;
}

const EnrollmentTable: React.FC<EnrollmentTableProps> = ({ onSelectEnrollment }) => {
  const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [programIdFilter, setProgramIdFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const pageSize = 10;

  async function loadInitialData() {
    try {
      setIsLoading(true);
      const [programsData] = await Promise.all([
        getPrograms().catch(() => []),
      ]);
      setPrograms(Array.isArray(programsData) ? programsData : []);
      setError(null);
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load programs');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEnrollments() {
    try {
      setIsLoading(true);
      const data = await getEnrollments({
        search: search.trim() || undefined,
        programId: programIdFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        skip: (pageNumber - 1) * pageSize,
        take: pageSize,
      });

      setEnrollments(data.data || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      console.error('Error loading enrollments:', err);
      const responseMessage = (err as any)?.response?.data?.message;
      setError(responseMessage || 'Failed to load enrollments');
      setEnrollments([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    void loadEnrollments();
  }, [search, programIdFilter, statusFilter, startDate, endDate, pageNumber]);

  const handleResetFilters = () => {
    setProgramIdFilter('');
    setStatusFilter('');
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPageNumber(1);
  };

  if (isLoading && enrollments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-900 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading enrollments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-y border-red-200 bg-red-50 p-4">
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => loadEnrollments()}
          className="mt-2 text-sm text-red-700 hover:underline font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="border-y border-slate-200 bg-white px-4 py-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">Find a Record</p>
            <h3 className="text-lg font-bold text-slate-900">Search and filter enrollments</h3>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 sm:block">{total} records</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Search Enrollment
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
              placeholder="Name, ID card, batch, or program"
              className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
            />
          </div>
          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Filter by Program
            </label>
            <select
              value={programIdFilter}
              onChange={(e) => {
                setProgramIdFilter(e.target.value);
                setPageNumber(1);
              }}
              className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Submitted From</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPageNumber(1); }} className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900" />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Submitted To</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPageNumber(1); }} className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900" />
          </div>

          <div>
            <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageNumber(1);
              }}
              className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ENROLLED">Enrolled</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="w-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {enrollments.length === 0 && !isLoading ? (
        <div className="border-y border-slate-200 bg-white py-14 text-center">
          <p className="text-slate-600 mb-4">No enrollments found</p>
          <button onClick={handleResetFilters} className="text-xs font-semibold text-blue-900 hover:underline">Clear filters</button>
        </div>
      ) : (
        <>

      {/* Table */}
      <div className="overflow-x-auto border-y border-slate-200 bg-white">
        <table className="min-w-[900px] w-full">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Trainee Name
              </th>
              <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Program
              </th>
              <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                ID Card Number
              </th>
              <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Status
              </th>
              <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Enrolled Date
              </th>
              <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {enrollments.map((enrollment) => {
              const traineeFirstName = enrollment.trainee.users?.first_name || 'Trainee';
              const traineeLastName = enrollment.trainee.users?.last_name || '';
              const traineeName = `${traineeFirstName} ${traineeLastName}`.trim();
              const enrolledDate = new Date(enrollment.enrolledAt).toLocaleDateString();

              return (
                <tr key={enrollment.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-4 text-sm font-semibold text-slate-800">{traineeName}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    {enrollment.batch.programs.name}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-700">
                    {enrollment.idCardNumber || 'N/A'}
                  </td>
                  <td className="px-4 py-4 text-sm">
                    <EnrollmentStatusBadge status={enrollment.enrollmentStatus} />
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-600">{enrolledDate}</td>
                  <td className="px-4 py-4 text-sm">
                    <button
                      onClick={() => onSelectEnrollment(enrollment.id)}
                      className="text-xs font-semibold text-blue-900 transition hover:text-blue-950 hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
        <div className="text-xs text-slate-500">
          Showing {Math.min((pageNumber - 1) * pageSize + 1, total)}-{Math.min(pageNumber * pageSize, total)} of {total}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber === 1}
            className="border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPageNumber(pageNumber + 1)}
            disabled={pageNumber * pageSize >= total}
            className="border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default EnrollmentTable;
