import { useEffect, useState } from 'react'
import type {
  Announcement,
  AnnouncementInput,
  AnnouncementScope,
} from '../../../api/announcements.api'

type Program = { id: string; name: string; program_code: string }
type Batch = { id: string; batch_name: string; programs?: { name: string } }

type Props = {
  open: boolean
  announcement: Announcement | null
  canPostGlobal: boolean
  programs: Program[]
  batches: Batch[]
  isSaving: boolean
  error: string
  onClose: () => void
  onSubmit: (data: AnnouncementInput | Pick<AnnouncementInput, 'content' | 'remarks'>) => Promise<void>
}

export default function AnnouncementFormModal({
  open,
  announcement,
  canPostGlobal,
  programs,
  batches,
  isSaving,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [scope, setScope] = useState<AnnouncementScope>('GLOBAL')
  const [content, setContent] = useState('')
  const [programId, setProgramId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [validationError, setValidationError] = useState('')

  useEffect(() => {
    if (!open) return
    setScope(announcement?.scope ?? (canPostGlobal ? 'GLOBAL' : 'PROGRAM'))
    setContent(announcement?.content ?? '')
    setProgramId(announcement?.programs?.id ?? '')
    setBatchId(announcement?.batch?.id ?? '')
    setRemarks(announcement?.remarks ?? '')
    setValidationError('')
  }, [open, announcement, canPostGlobal])

  if (!open) return null
  const editing = announcement !== null

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!content.trim()) {
      setValidationError('Content cannot be empty.')
      return
    }
    if (!editing && scope === 'PROGRAM' && !programId) {
      setValidationError('Select a program.')
      return
    }
    if (!editing && scope === 'BATCH' && !batchId) {
      setValidationError('Select a batch.')
      return
    }
    setValidationError('')
    if (editing) {
      await onSubmit({ content: content.trim(), remarks: remarks.trim() })
    } else {
      await onSubmit({
        scope,
        content: content.trim(),
        ...(scope === 'PROGRAM' ? { program_id: programId } : {}),
        ...(scope === 'BATCH' ? { batch_id: batchId } : {}),
        remarks: remarks.trim() || undefined,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-4 py-6">
      <form onSubmit={submit} className="w-full max-w-xl space-y-5 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
              {editing ? 'Edit announcement' : 'New announcement'}
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {editing ? 'Update announcement' : 'Post announcement'}
            </h2>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="text-xl text-slate-400">×</button>
        </div>

        {!editing && (
          <label className="block text-sm font-semibold text-slate-700">
            Scope
            <select value={scope} onChange={(event) => setScope(event.target.value as AnnouncementScope)} className="mt-2 w-full border border-slate-300 px-3 py-2.5 font-normal">
              {canPostGlobal && <option value="GLOBAL">Global</option>}
              <option value="PROGRAM">Program</option>
              <option value="BATCH">Batch</option>
            </select>
          </label>
        )}

        {!editing && scope === 'PROGRAM' && (
          <label className="block text-sm font-semibold text-slate-700">
            Program
            <select value={programId} onChange={(event) => setProgramId(event.target.value)} className="mt-2 w-full border border-slate-300 px-3 py-2.5 font-normal">
              <option value="">Select a program</option>
              {programs.map((program) => <option key={program.id} value={program.id}>{program.name} ({program.program_code})</option>)}
            </select>
          </label>
        )}

        {!editing && scope === 'BATCH' && (
          <label className="block text-sm font-semibold text-slate-700">
            Batch
            <select value={batchId} onChange={(event) => setBatchId(event.target.value)} className="mt-2 w-full border border-slate-300 px-3 py-2.5 font-normal">
              <option value="">Select a batch</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_name}{batch.programs?.name ? ` — ${batch.programs.name}` : ''}</option>)}
            </select>
          </label>
        )}

        <label className="block text-sm font-semibold text-slate-700">
          Content
          <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={5} maxLength={5000} className="mt-2 w-full border border-slate-300 px-3 py-2.5 font-normal" />
        </label>
        <label className="block text-sm font-semibold text-slate-700">
          Remarks <span className="font-normal text-slate-400">(optional)</span>
          <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} maxLength={1000} className="mt-2 w-full border border-slate-300 px-3 py-2.5 font-normal" />
        </label>
        {(validationError || error) && <p className="text-sm text-red-600">{validationError || error}</p>}
        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" disabled={isSaving} className="bg-blue-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSaving ? 'Saving…' : 'Save announcement'}</button>
        </div>
      </form>
    </div>
  )
}
