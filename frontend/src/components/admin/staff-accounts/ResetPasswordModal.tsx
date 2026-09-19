// src/components/admin/staff-accounts/ResetPasswordModal.tsx

import React, { useState } from 'react'

import type { StaffMember } from '../../../api/users/admin.api'

interface ResetPasswordModalProps {
  open: boolean
  member: StaffMember | null
  onClose: () => void
  onConfirm: () => Promise<void>
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  open,
  member,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setLoading(true)
    setError('')

    try {
      await onConfirm()
      setDone(true)
    } catch (err: any) {
      setError(
        err.message ?? 'Failed to send reset email. Try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDone(false)
    setError('')
    onClose()
  }

  if (!open || !member) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md border border-slate-200 bg-white shadow-2xl">
        {done ? (
          // ── Success state ──
          <div>
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
                Staff accounts
              </p>

              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Reset email sent
              </h2>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="border-l-4 border-green-600 bg-green-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-green-100 text-green-700">
                    <i className="fa-solid fa-check text-xs" />
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-green-800">
                      Password reset link sent
                    </p>

                    <p className="mt-1 text-xs leading-5 text-green-700">
                      A password reset link was sent to{' '}
                      <span className="font-semibold">
                        {member.first_name} {member.last_name}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="w-full bg-blue-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          // ── Confirmation state ──
          <>
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Account security
                  </p>

                  <h2 className="text-xl font-bold tracking-tight text-slate-950">
                    Send password reset?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Send a password reset link to this staff member's
                    registered email address.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  aria-label="Close modal"
                  className="flex h-8 w-8 shrink-0 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-blue-900 disabled:opacity-50"
                >
                  <i className="fa-solid fa-xmark text-sm" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {/* Staff member */}
              <div className="border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Staff member
                </p>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-blue-50 text-[10px] font-bold text-blue-900">
                    {member.first_name[0]}
                    {member.last_name[0]}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {member.first_name} {member.last_name}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-400">
                      {member.email ?? 'No email address available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning / information */}
              <div className="mt-5 border-l-4 border-yellow-400 bg-yellow-50 px-4 py-3">
                <p className="text-xs font-semibold text-yellow-800">
                  Important
                </p>

                <p className="mt-1 text-xs leading-5 text-yellow-700">
                  Their current password remains active until they
                  complete the password reset.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-5 border-l-4 border-red-500 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold text-red-700">
                    Unable to send reset email
                  </p>

                  <p className="mt-1 text-xs leading-5 text-red-600">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-blue-900 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="bg-blue-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
