import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  announcementsApi,
  type Announcement,
  type AnnouncementInput,
  type AnnouncementScope,
} from '../../api/announcements.api'
import AnnouncementAuthor from './AnnouncementAuthor'
import AnnouncementTarget from './AnnouncementTarget'

type Program = { id: string; name: string; program_code: string }
type Batch = { id: string; batch_name: string; programs?: { name: string } }

type AnnouncementsProps = {
  canPostGlobal?: boolean
  canPostProgram?: boolean
  canPostBatch?: boolean
  canDelete?: boolean
  canEdit?: boolean
  manageAll?: boolean
}

export default function Announcements({
  canPostGlobal,
  canPostProgram,
  canPostBatch,
  canDelete,
  canEdit,
  manageAll,
}: AnnouncementsProps) {
  const { accessToken, sessionToken, user } = useAuth()
  const role = user?.role
  const allowedGlobal = canPostGlobal ?? ['ADMIN', 'REGISTRAR', 'ENCODER'].includes(role ?? '')
  const allowedProgram =
    canPostProgram ?? ['ADMIN', 'REGISTRAR', 'ENCODER', 'TRAINER'].includes(role ?? '')
  const allowedBatch =
    canPostBatch ?? ['ADMIN', 'REGISTRAR', 'ENCODER', 'TRAINER'].includes(role ?? '')
  const canManageAllAnnouncements = manageAll ?? role === 'ADMIN'
  const canEditAnnouncements =
    canEdit ?? ['ADMIN', 'REGISTRAR', 'ENCODER', 'TRAINER'].includes(role ?? '')
  const canDeleteAnnouncements = canDelete ?? ['ADMIN', 'REGISTRAR'].includes(role ?? '')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [scope, setScope] = useState<AnnouncementScope>(
    allowedGlobal ? 'GLOBAL' : allowedProgram ? 'PROGRAM' : 'BATCH',
  )
  const [content, setContent] = useState('')
  const [programId, setProgramId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingRemarks, setEditingRemarks] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterScope, setFilterScope] = useState('')
  const [search, setSearch] = useState('')
  const [postedDate, setPostedDate] = useState('')

  const loadAnnouncements = useCallback(async () => {
    if (!accessToken || !sessionToken) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      })
      if (filterScope) params.set('scope', filterScope)
      if (search.trim()) params.set('search', search.trim())
      if (postedDate) {
        params.set('date_from', postedDate)
        params.set('date_to', `${postedDate}T23:59:59.999Z`)
      }

      if (canManageAllAnnouncements) {
        const response = await announcementsApi.list(`?${params.toString()}`)
        setAnnouncements(response.data)
        setTotalPages(response.meta.totalPages)
        setTotal(response.meta.total)
      } else {
        setAnnouncements(await announcementsApi.active())
        setTotalPages(1)
        setTotal(0)
      }

      if (allowedProgram || allowedBatch) {
        const options = await announcementsApi.options()
        setPrograms(options.programs)
        setBatches(options.batches)
      }

      setError('')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to load announcements',
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    allowedBatch,
    allowedProgram,
    canManageAllAnnouncements,
    filterScope,
    page,
    postedDate,
    search,
    sessionToken,
  ])

  useEffect(() => {
    void loadAnnouncements()
  }, [loadAnnouncements])

  const resetComposer = () => {
    setContent('')
    setProgramId('')
    setBatchId('')
    setRemarks('')
    setScope(allowedGlobal ? 'GLOBAL' : allowedProgram ? 'PROGRAM' : 'BATCH')
  }

  const createAnnouncement = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!content.trim()) {
      setError('Content cannot be empty.')
      return
    }
    if (scope === 'PROGRAM' && !programId) {
      setError('Select a program.')
      return
    }
    if (scope === 'BATCH' && !batchId) {
      setError('Select a batch.')
      return
    }

    const body: AnnouncementInput = {
      scope,
      content: content.trim(),
      ...(scope === 'PROGRAM' ? { program_id: programId } : {}),
      ...(scope === 'BATCH' ? { batch_id: batchId } : {}),
      remarks: remarks.trim() || undefined,
    }

    setIsSaving(true)
    try {
      await announcementsApi.create(body)
      resetComposer()
      setSuccess('Announcement posted successfully.')
      setPage(1)
      await loadAnnouncements()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save announcement',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (announcement: Announcement) => {
    setError('')
    setSuccess('')
    setEditingId(announcement.id)
    setEditingContent(announcement.content)
    setEditingRemarks(announcement.remarks ?? '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingContent('')
    setEditingRemarks('')
  }

  const updateAnnouncement = async (id: string) => {
    if (!editingContent.trim()) {
      setError('Content cannot be empty.')
      return
    }

    setError('')
    setSuccess('')
    setIsSaving(true)
    try {
      const updated = await announcementsApi.update(id, {
        content: editingContent.trim(),
        remarks: editingRemarks.trim() || undefined,
      })
      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === id ? updated : announcement,
        ),
      )
      cancelEditing()
      setSuccess('Announcement updated successfully.')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update announcement',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const deleteAnnouncement = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return

    setError('')
    setSuccess('')
    try {
      await announcementsApi.remove(id)
      setAnnouncements((current) =>
        current.filter((announcement) => announcement.id !== id),
      )
      setSuccess('Announcement deleted successfully.')
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete announcement',
      )
    }
  }

  return (
    <>
      <form
        onSubmit={createAnnouncement}
        className="grid gap-4 border border-slate-200 bg-white p-6 md:grid-cols-2"
      >
        <label className="text-sm font-medium text-slate-700">
          Scope
          <select
            value={scope}
            onChange={(event) =>
              setScope(event.target.value as AnnouncementScope)
            }
            className="mt-2 w-full border border-slate-300 p-3"
          >
            {allowedGlobal && <option value="GLOBAL">Global</option>}
            {allowedProgram && <option value="PROGRAM">Program</option>}
            {allowedBatch && <option value="BATCH">Batch</option>}
          </select>
        </label>

        {scope === 'PROGRAM' && (
          <label className="text-sm font-medium text-slate-700">
            Program
            <select
              required
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              className="mt-2 w-full border border-slate-300 p-3"
            >
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.program_code})
                </option>
              ))}
            </select>
          </label>
        )}

        {scope === 'BATCH' && (
          <label className="text-sm font-medium text-slate-700">
            Batch
            <select
              required
              value={batchId}
              onChange={(event) => setBatchId(event.target.value)}
              className="mt-2 w-full border border-slate-300 p-3"
            >
              <option value="">Select a batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batch_name}
                  {batch.programs?.name ? ` — ${batch.programs.name}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Content
          <textarea
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            maxLength={5000}
            className="mt-2 w-full border border-slate-300 p-3"
          />
        </label>

        <label className="text-sm font-medium text-slate-700 md:col-span-2">
          Remarks (optional)
          <input
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            maxLength={1000}
            className="mt-2 w-full border border-slate-300 p-3"
          />
        </label>

        {(error || success) && (
          <p
            className={`text-sm md:col-span-2 ${
              error ? 'text-red-600' : 'text-emerald-700'
            }`}
          >
            {error || success}
          </p>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-fit bg-blue-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isSaving ? 'Publishing...' : 'Publish announcement'}
        </button>
      </form>

      <div className="mt-6 grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search content or remarks"
          className="border border-slate-300 p-2.5 text-sm md:col-span-2"
        />
        <select
          value={filterScope}
          onChange={(event) => {
            setFilterScope(event.target.value)
            setPage(1)
          }}
          className="border border-slate-300 p-2.5 text-sm"
        >
          <option value="">All scopes</option>
          <option value="GLOBAL">Global</option>
          <option value="PROGRAM">Program</option>
          <option value="BATCH">Batch</option>
        </select>
        <input
          type="date"
          value={postedDate}
          onChange={(event) => {
            setPostedDate(event.target.value)
            setPage(1)
          }}
          className="border border-slate-300 p-2.5 text-sm"
          aria-label="Posted date"
        />
      </div>

      <div className="mt-8 space-y-3">
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No announcements yet.</p>
        ) : (
          announcements.map((announcement) => (
            <article
              key={announcement.id}
              className="flex items-start justify-between gap-4 border border-slate-200 bg-white p-5"
            >
              {editingId === announcement.id ? (
                <div className="w-full space-y-3">
                  <AnnouncementTarget announcement={announcement} />
                  <textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    rows={3}
                    maxLength={5000}
                    className="w-full border border-slate-300 p-3"
                  />
                  <input
                    value={editingRemarks}
                    onChange={(event) => setEditingRemarks(event.target.value)}
                    placeholder="Remarks (optional)"
                    maxLength={1000}
                    className="w-full border border-slate-300 p-3"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void updateAnnouncement(announcement.id)}
                      className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={cancelEditing}
                      className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <AnnouncementAuthor
                    layout="stacked"
                    role={announcement.users?.role}
                    firstName={announcement.users?.first_name}
                    lastName={announcement.users?.last_name}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-4">
                      <AnnouncementTarget announcement={announcement} />
                      <span className="text-xs text-slate-400">
                        {new Date(announcement.posted_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-900">{announcement.content}</p>
                    {announcement.remarks && (
                      <p className="mt-2 text-xs text-slate-500">
                        {announcement.remarks}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-3">
                    {canEditAnnouncements &&
                      (role === 'ADMIN' || announcement.posted_by === user?.id) && (
                      <button
                        type="button"
                        onClick={() => startEditing(announcement)}
                        className="text-sm font-semibold text-blue-800"
                      >
                        Edit
                      </button>
                    )}

                    {canDeleteAnnouncements &&
                      announcement.posted_by === user?.id && (
                      <button
                        type="button"
                        onClick={() => void deleteAnnouncement(announcement.id)}
                        className="text-sm font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
      {!isLoading && total > 0 && (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
              className="border border-slate-300 px-3 py-2 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="border border-slate-300 px-3 py-2 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  )
}
