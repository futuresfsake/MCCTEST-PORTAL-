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
      <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="border border-slate-200 rounded-lg p-4 bg-white">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search Enrollment
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPageNumber(1); }}
              placeholder="Name, ID card, batch, or program"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter by Program
            </label>
            <select
              value={programIdFilter}
              onChange={(e) => {
                setProgramIdFilter(e.target.value);
                setPageNumber(1);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Submitted From</label>
            <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPageNumber(1); }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Submitted To</label>
            <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPageNumber(1); }} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPageNumber(1);
              }}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
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
              className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {enrollments.length === 0 && !isLoading ? (
        <div className="text-center py-12 border border-slate-200 rounded-lg bg-slate-50">
          <p className="text-slate-600 mb-4">No enrollments found</p>
          <button onClick={handleResetFilters} className="text-sm text-blue-900 hover:underline font-medium">Clear filters</button>
        </div>
      ) : (
        <>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                Trainee Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                Program
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                ID Card Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                Enrolled Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {enrollments.map((enrollment) => {
              const traineeFirstName = enrollment.trainee.users?.first_name || 'Trainee';
              const traineeLastName = enrollment.trainee.users?.last_name || '';
              const traineeName = `${traineeFirstName} ${traineeLastName}`.trim();
              const enrolledDate = new Date(enrollment.enrolledAt).toLocaleDateString();

              return (
                <tr key={enrollment.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm text-slate-900">{traineeName}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {enrollment.batch.programs.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-mono">
                    {enrollment.idCardNumber || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <EnrollmentStatusBadge status={enrollment.enrollmentStatus} />
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{enrolledDate}</td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => onSelectEnrollment(enrollment.id)}
                      className="text-blue-900 hover:text-blue-700 hover:underline font-medium"
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
      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <div className="text-sm text-slate-600">
          Showing {Math.min((pageNumber - 1) * pageSize + 1, total)}-{Math.min(pageNumber * pageSize, total)} of {total}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
            disabled={pageNumber === 1}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
          >
            Previous
          </button>
          <button
            onClick={() => setPageNumber(pageNumber + 1)}
            disabled={pageNumber * pageSize >= total}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition"
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
