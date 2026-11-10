import React from 'react';
import { X } from 'lucide-react';

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-900 disabled:bg-slate-100 disabled:text-slate-500';

export const primaryButtonClass =
  'rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50';

export const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50';

export const FormField: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
    {children}
  </label>
);

interface ProfileModalProps {
  title: string;
  /** Saving must finish first, so closing is disabled meanwhile. */
  busy: boolean;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** Dialog shell for the admin's actions on a trainee profile. */
const ProfileModal: React.FC<ProfileModalProps> = ({ title, busy, onClose, footer, children }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
    <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-full w-full max-w-3xl flex-col rounded-lg bg-white shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="text-slate-500 transition hover:text-slate-900 disabled:opacity-50">
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>
    </div>
  </div>
);

export default ProfileModal;
