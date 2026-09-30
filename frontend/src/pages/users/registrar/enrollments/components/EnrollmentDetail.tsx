import React, { useEffect, useState } from 'react';
import { getEnrollmentDetail, updateEnrollmentStatus } from '../../../../../api/users/registrar.api';
import EnrollmentStatusBadge from './EnrollmentStatusBadge';

interface EnrollmentDetailProps {
  enrollmentId: string;
  onClose: () => void;
}

const EnrollmentDetail: React.FC<EnrollmentDetailProps> = ({
  enrollmentId,
  onClose,
}) => {
  const [enrollment, setEnrollment] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    loadEnrollmentDetail();
  }, [enrollmentId]);

  const loadEnrollmentDetail = async () => {
    try {
      setIsLoading(true);
      const data = await getEnrollmentDetail(enrollmentId);
      setEnrollment(data);
      setError(null);
    } catch (err) {
      console.error('Error loading enrollment detail:', err);
      setError('Failed to load enrollment details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setIsUpdatingStatus(true);
      await updateEnrollmentStatus(enrollmentId, newStatus);
      setEnrollment((prev: any) => ({
        ...prev,
        enrollment_status: newStatus,
      }));
      setError(null);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('Failed to update enrollment status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/40" />
        <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="flex h-full w-screen max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="text-center py-12">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-900"></div>
            <p className="text-slate-600">Loading enrollment details...</p>
          </div>
        </div>
        </div>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/40" />
        <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="flex h-full w-screen max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="text-red-700 mb-4">{error || 'Enrollment not found'}</p>
            <button
              onClick={onClose}
              className="border border-blue-900 bg-blue-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-950"
            >
              Close
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  const traineeFirstName = enrollment.trainee?.users?.first_name || 'Trainee';
  const traineeLastName = enrollment.trainee?.users?.last_name || '';
  const traineeName = `${traineeFirstName} ${traineeLastName}`.trim();
  const enrolledDate = new Date(enrollment.enrolled_at).toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
      <div className="flex h-full w-screen max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-800">Enrollment Record</p>
            <h2 className="text-xl font-bold text-slate-900">Enrollment Details</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close enrollment details"
            className="flex h-8 w-8 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-blue-900"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {error && (
            <div className="border-y border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Status Section */}
          <div className="border-y border-slate-200 bg-white py-4">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enrollment Status</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                  Current Status
                </p>
                <EnrollmentStatusBadge status={enrollment.enrollment_status} />
              </div>

              <select
                value={enrollment.enrollment_status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdatingStatus}
                  className="border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900 disabled:opacity-50"
              >
                <option value="PENDING">Pending</option>
                <option value="ENROLLED">Enrolled</option>
                <option value="WITHDRAWN">Withdrawn</option>
                <option value="COMPLETED">Completed</option>
                <option value="DROPPED">Dropped</option>
              </select>
            </div>
          </div>

          {/* Trainee Information */}
          <div className="border-y border-slate-200 bg-white py-4">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Trainee Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-600">Name</p>
                <p className="text-slate-900">{traineeName}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Contact Number</p>
                <p className="text-slate-900">{enrollment.trainee?.contact_number}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Gender</p>
                <p className="text-slate-900">{enrollment.trainee?.gender}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Date of Birth</p>
                <p className="text-slate-900">
                  {new Date(enrollment.trainee?.date_of_birth).toLocaleDateString()}
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-medium text-slate-600">Address</p>
                <p className="text-slate-900">
                  {enrollment.trainee?.street_address}, {enrollment.trainee?.barangay},
                  {enrollment.trainee?.municipality}, {enrollment.trainee?.province}
                </p>
              </div>
            </div>
          </div>

          {/* Batch Information */}
          <div className="border-y border-slate-200 bg-white py-4">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Batch Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-600">Program</p>
                <p className="text-slate-900">{enrollment.batch?.programs?.name}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Batch</p>
                <p className="text-slate-900">{enrollment.batch?.batch_name}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Start Date</p>
                <p className="text-slate-900">
                  {new Date(enrollment.batch?.start_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="font-medium text-slate-600">End Date</p>
                <p className="text-slate-900">
                  {new Date(enrollment.batch?.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Enrollment Details */}
          <div className="border-y border-slate-200 bg-white py-4">
            <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Enrollment Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium text-slate-600">ID Card Number</p>
                <p className="text-slate-900 font-mono">{enrollment.id_card_number}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Uniform Size</p>
                <p className="text-slate-900">{enrollment.uniform_size}</p>
              </div>
              <div>
                <p className="font-medium text-slate-600">Enrolled Date</p>
                <p className="text-slate-900">{enrolledDate}</p>
              </div>
              {enrollment.official_receipts && enrollment.official_receipts[0] && (
                <div>
                  <p className="font-medium text-slate-600">OR Number</p>
                  <p className="text-slate-900 font-mono">
                    {enrollment.official_receipts[0].or_number}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Checklist */}
          {enrollment.requirement_checklist && (
            <div className="border-y border-slate-200 bg-white py-4">
              <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Submitted Documents</h3>
              <div className="space-y-2 text-sm">
                {[
                  { key: 'bc_nso_psa_copy', label: 'BC/NSO PSA Copy' },
                  { key: 'diploma_tor', label: 'Diploma/TOR' },
                  { key: 'brgy_clearance', label: 'Barangay Clearance' },
                  { key: 'one_by_one_pic', label: '1x1 Picture' },
                  { key: 'two_by_two_pic', label: '2x2 Picture' },
                  { key: 'passport_size', label: 'Passport Size Picture' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(enrollment.requirement_checklist as any)[key] || false}
                      disabled
                      className="w-4 h-4"
                    />
                    <span className={
                      (enrollment.requirement_checklist as any)[key]
                        ? 'text-slate-900 font-medium'
                        : 'text-slate-600'
                    }>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            onClick={onClose}
            className="border border-blue-900 bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950"
          >
            Close
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default EnrollmentDetail;
