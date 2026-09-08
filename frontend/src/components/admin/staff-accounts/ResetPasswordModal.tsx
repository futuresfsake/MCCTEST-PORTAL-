// src/components/admin/staff-accounts/ResetPasswordModal.tsx
import React, { useState } from 'react';
import type { StaffMember } from '../../../api/users/admin.api';

interface ResetPasswordModalProps {
  open: boolean;
  member: StaffMember | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  member,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm();
      setDone(true);
    } catch (err: any) {
      setError(err.message ?? 'Failed to send reset email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDone(false);
    setError('');
    onClose();
  };

  if (!open || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        {done ? (
          // ── Success state ──
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Reset email sent</p>
              <p className="mt-1 text-sm text-gray-500">
                A password reset link was sent to{' '}
                <span className="font-medium text-gray-700">
                  {member.first_name} {member.last_name}
                </span>
                .
              </p>
            </div>
            <button
              onClick={handleClose}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Done
            </button>
          </div>
        ) : (
          // ── Confirmation state ──
          <>
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>

            <h2 className="text-base font-semibold text-gray-900">Send password reset?</h2>
            <p className="mt-1 text-sm text-gray-500">
              This will email a reset link to{' '}
              <span className="font-medium text-gray-800">
                {member.first_name} {member.last_name}
              </span>
              . Their current password stays active until they reset it.
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleClose}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
