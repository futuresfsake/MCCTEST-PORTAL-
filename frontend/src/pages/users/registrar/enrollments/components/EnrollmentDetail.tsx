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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-900 mb-4"></div>
            <p className="text-slate-600">Loading enrollment details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !enrollment) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <p className="text-red-700 mb-4">{error || 'Enrollment not found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition"
            >
              Close
            </button>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Enrollment Details</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Status Section */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Enrollment Status</h3>
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
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 disabled:opacity-50"
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
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Trainee Information</h3>
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
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Batch Information</h3>
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
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Enrollment Details</h3>
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
            <div className="border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-4">Submitted Documents</h3>
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
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnrollmentDetail;
