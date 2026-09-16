import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../context/AuthContext'

type Scope = 'GLOBAL' | 'PROGRAM' | 'BATCH'

type Announcement = {
  id: string
  scope: Scope
  content: string
  program_id: string | null
  batch_id: string | null
  posted_at: string
  remarks: string | null
}

const apiUrl = import.meta.env.VITE_API_URL

function AdminAnnouncements() {
  const { accessToken, sessionToken } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [scope, setScope] = useState<Scope>('GLOBAL')
  const [content, setContent] = useState('')
  const [programId, setProgramId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingRemarks, setEditingRemarks] = useState('')

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-Session-Token': sessionToken ?? '',
    'Content-Type': 'application/json',
  }

  const loadAnnouncements = async () => {
    const response = await fetch(`${apiUrl}/announcements`, { headers })
    if (!response.ok) throw new Error('Unable to load announcements')
    setAnnouncements(await response.json())
  }

  useEffect(() => {
    if (!accessToken || !sessionToken) return
    loadAnnouncements().catch((requestError: Error) => setError(requestError.message))
  }, [accessToken, sessionToken])

  const createAnnouncement = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    const body: Record<string, string> = { scope, content }
    if (scope === 'PROGRAM') body.program_id = programId
    if (scope === 'BATCH') body.batch_id = batchId
    if (remarks) body.remarks = remarks

    try {
      const response = await fetch(`${apiUrl}/announcements`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(
        Array.isArray(data.message) ? data.message.join(', ') : data.message,
      )

      setContent('')
      setProgramId('')
      setBatchId('')
      setRemarks('')
      await loadAnnouncements()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to save announcement')
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = (announcement: Announcement) => {
    setError('')
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
    setError('')
    try {
      const response = await fetch(`${apiUrl}/announcements/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          content: editingContent,
          remarks: editingRemarks || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message) ? data.message.join(', ') : data.message,
        )
      }

      setAnnouncements((current) =>
        current.map((announcement) =>
          announcement.id === id
            ? { ...announcement, content: data.content, remarks: data.remarks }
            : announcement,
        ),
      )
      cancelEditing()
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update announcement',
      )
    }
  }

  const deleteAnnouncement = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return
    const response = await fetch(`${apiUrl}/announcements/${id}`, {
      method: 'DELETE',
      headers,
    })
    if (!response.ok) {
      setError('Unable to delete announcement')
      return
    }
    setAnnouncements((current) => current.filter((announcement) => announcement.id !== id))
  }

  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
            Communications
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">Announcements</h2>
          <p className="mt-2 text-slate-600">Publish notices for the whole portal, a program, or a batch.</p>
        </div>

        <form onSubmit={createAnnouncement} className="grid gap-4 border border-slate-200 bg-white p-6 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Scope
            <select value={scope} onChange={(event) => setScope(event.target.value as Scope)} className="mt-2 w-full border border-slate-300 p-3">
              <option value="GLOBAL">Global</option>
              <option value="PROGRAM">Program</option>
              <option value="BATCH">Batch</option>
            </select>
          </label>
          {scope === 'PROGRAM' && (
            <label className="text-sm font-medium text-slate-700">
              Program ID (UUID)
              <input required value={programId} onChange={(event) => setProgramId(event.target.value)} className="mt-2 w-full border border-slate-300 p-3" />
            </label>
          )}
          {scope === 'BATCH' && (
            <label className="text-sm font-medium text-slate-700">
              Batch ID (UUID)
              <input required value={batchId} onChange={(event) => setBatchId(event.target.value)} className="mt-2 w-full border border-slate-300 p-3" />
            </label>
          )}
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Content
            <textarea required value={content} onChange={(event) => setContent(event.target.value)} rows={3} className="mt-2 w-full border border-slate-300 p-3" />
          </label>
          <label className="text-sm font-medium text-slate-700 md:col-span-2">
            Remarks (optional)
            <input value={remarks} onChange={(event) => setRemarks(event.target.value)} className="mt-2 w-full border border-slate-300 p-3" />
          </label>
          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
          <button disabled={isSaving} className="w-fit bg-blue-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {isSaving ? 'Publishing...' : 'Publish announcement'}
          </button>
        </form>

        <div className="mt-8 space-y-3">
          {announcements.map((announcement) => (
            <article key={announcement.id} className="flex items-start justify-between gap-4 border border-slate-200 bg-white p-5">
              {editingId === announcement.id ? (
                <div className="w-full space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">{announcement.scope}</p>
                  <textarea
                    value={editingContent}
                    onChange={(event) => setEditingContent(event.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 p-3"
                  />
                  <input
                    value={editingRemarks}
                    onChange={(event) => setEditingRemarks(event.target.value)}
                    placeholder="Remarks (optional)"
                    className="w-full border border-slate-300 p-3"
                  />
                  <div className="flex gap-3">
                    <button type="button" onClick={() => updateAnnouncement(announcement.id)} className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white">
                      Save changes
                    </button>
                    <button type="button" onClick={cancelEditing} className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-800">{announcement.scope}</p>
                    <p className="mt-2 text-slate-900">{announcement.content}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {new Date(announcement.posted_at).toLocaleString()}
                      {announcement.remarks ? ` · ${announcement.remarks}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-3">
                    <button type="button" onClick={() => startEditing(announcement)} className="text-sm font-semibold text-blue-800">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteAnnouncement(announcement.id)} className="text-sm font-semibold text-red-700">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
          {announcements.length === 0 && <p className="text-sm text-slate-500">No announcements yet.</p>}
        </div>
      </div>
    </section>
  )
}

export default AdminAnnouncements
