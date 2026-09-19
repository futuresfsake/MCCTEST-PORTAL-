// frontend\src\components\common\UnsavedChangesModal.tsx
import React from 'react'

interface UnsavedChangesModalProps {
  open: boolean
  onKeepEditing: () => void
  onDiscard: () => void
}

export const UnsavedChangesModal: React.FC<
  UnsavedChangesModalProps
> = ({
  open,
  onKeepEditing,
  onDiscard,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4">
      <div
        className="w-full max-w-md border border-slate-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-changes-title"
      >
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-yellow-100 text-yellow-600">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>

            <div>
              <h2
                id="unsaved-changes-title"
                className="text-lg font-bold text-slate-950"
              >
                Unsaved changes
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                You have unsaved changes. Are you sure you want to
                close this form? Your changes will be lost.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onKeepEditing}
            className="border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-blue-900"
          >
            Keep editing
          </button>

          <button
            type="button"
            onClick={onDiscard}
            className="bg-red-800 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-red-900">
            Discard changes
          </button>
        </div>
      </div>
    </div>
  )
}
