import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { traineeApi } from '../../../../api/users/trainee.api'
import { useAuth } from '../../../../context/AuthContext'
import type { TraineeProfile, UpdateTraineeProfile } from '../../../../types/trainee-profile.type'

const emptyEditable: UpdateTraineeProfile = {
  contactNumber: '',
  streetAddress: '',
  barangay: '',
  municipality: '',
  district: '',
  province: '',
}

const labels: Record<string, string> = {
  system_id: 'System ID', email: 'Email', first_name: 'First name', middle_name: 'Middle name',
  last_name: 'Last name', date_of_birth: 'Date of birth', place_of_birth: 'Place of birth',
  gender: 'Gender', citizenship: 'Citizenship', mother_name: "Mother's name", father_name: "Father's name",
  civil_status: 'Civil status', highest_education: 'Highest education', employment_status: 'Employment status',
  employment_type: 'Employment type', pwd: 'PWD', contact_number: 'Contact number',
  street_address: 'Street address', barangay: 'Barangay', municipality: 'Municipality',
  district: 'District', province: 'Province',
}

function formatValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return '—'
  return String(value).replaceAll('_', ' ')
}

export default function TraineeProfilePage() {
  const { updateUser } = useAuth()
  const [profile, setProfile] = useState<TraineeProfile | null>(null)
  const [editable, setEditable] = useState(emptyEditable)
  const [editing, setEditing] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [visiblePasswords, setVisiblePasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const result = await traineeApi.profile()
      setProfile(result)
      setEditable({
        contactNumber: result.trainee.contact_number,
        streetAddress: result.trainee.street_address,
        barangay: result.trainee.barangay,
        municipality: result.trainee.municipality,
        district: result.trainee.district,
        province: result.trainee.province,
      })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const resetEditable = () => {
    if (!profile) return
    setEditable({
      contactNumber: profile.trainee.contact_number,
      streetAddress: profile.trainee.street_address,
      barangay: profile.trainee.barangay,
      municipality: profile.trainee.municipality,
      district: profile.trainee.district,
      province: profile.trainee.province,
    })
  }

  const cancelEdit = () => {
    resetEditable()
    setPhoto(null)
    setPreview(null)
    setEditing(false)
    setError(null)
  }

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      let updated = await traineeApi.updateProfile(editable)
      if (photo) {
        const uploaded = await traineeApi.uploadPhoto(photo)
        updated = { ...updated, avatar_url: uploaded.avatarUrl }
      }
      setProfile(updated)
      updateUser({ avatarUrl: updated.avatar_url })
      setPhoto(null)
      setPreview(null)
      setEditing(false)
      setMessage('Profile updated successfully.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your profile.')
    } finally {
      setSaving(false)
    }
  }

  const changePassword = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordFeedback(null)
    if (password.newPassword !== password.confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'New password and confirm password do not match.' })
      return
    }
    setSaving(true)
    try {
      const result = await traineeApi.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      })
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordFeedback({ type: 'success', text: result.message || 'Password successfully changed.' })
    } catch (reason) {
      setPasswordFeedback({
        type: 'error',
        text: reason instanceof Error ? reason.message : 'Unable to change your password.',
      })
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'mt-1 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800'
  const readOnlyClass = 'border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-500'
  const name = profile ? [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ') : ''
  const photoUrl = preview ?? profile?.avatar_url ?? null

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <Header />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar variant="trainee" />
        <main className="min-w-0 flex-1 bg-slate-50">
          <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">Trainee Portal</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-950">My Profile</h1>
                <p className="mt-2 text-sm text-slate-500">Keep your contact details current.</p>
              </div>
              {!loading && profile && !editing && <button type="button" onClick={() => setEditing(true)} className="border border-blue-900 bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Edit profile</button>}
            </div>

            {loading ? <p className="text-sm text-slate-500">Loading profile...</p> : error && !profile ? (
              <div className="border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</div>
            ) : profile ? (
              <div className="space-y-6">
                {(message || error) && <div className={error ? 'border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700' : 'border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-700'}>{error ?? message}</div>}
                <form onSubmit={saveProfile} className="space-y-6">
                  <Section title="Account">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-2xl font-bold text-blue-900">
                        {photoUrl ? <img src={photoUrl} alt={`${name} profile`} className="h-full w-full object-cover" /> : `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-950">{name}</p>
                        {editing && <label className="mt-2 inline-block cursor-pointer border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          Choose JPG or PNG
                          <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => {
                            const selected = event.target.files?.[0]
                            if (!selected) return
                            if (selected.size > 2 * 1024 * 1024) { setError('Photo must be 2 MB or smaller.'); return }
                            setPhoto(selected)
                            setPreview(URL.createObjectURL(selected))
                            setError(null)
                          }} />
                        </label>}
                        {editing && <p className="mt-1 text-xs text-slate-500">Maximum size: 2 MB. Photos are resized to 400 × 400.</p>}
                      </div>
                    </div>
                    <ReadOnlyGrid fields={{ system_id: profile.system_id, email: profile.email }} className={readOnlyClass} />
                  </Section>
                  <Section title="Personal Information">
                    <ReadOnlyGrid fields={{
                      first_name: profile.first_name, middle_name: profile.middle_name, last_name: profile.last_name,
                      date_of_birth: profile.trainee.date_of_birth, place_of_birth: profile.trainee.place_of_birth,
                      gender: profile.trainee.gender, citizenship: profile.trainee.citizenship,
                    }} className={readOnlyClass} />
                  </Section>
                  <Section title="Contact & Address">
                    {editing ? <div className="grid gap-4 sm:grid-cols-2">{Object.entries(editable).map(([field, value]) => (
                      <label key={field} className="text-sm font-medium text-slate-700">
                        {field === 'contactNumber' ? 'Contact number' : field.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())}
                        <input className={inputClass} value={value} required maxLength={field === 'contactNumber' ? 15 : 100} onChange={(event) => setEditable((current) => ({ ...current, [field]: event.target.value }))} />
                      </label>
                    ))}</div> : <ReadOnlyGrid fields={{
                      contact_number: profile.trainee.contact_number, street_address: profile.trainee.street_address,
                      barangay: profile.trainee.barangay, municipality: profile.trainee.municipality,
                      district: profile.trainee.district, province: profile.trainee.province,
                    }} className={readOnlyClass} />}
                  </Section>
                  <Section title="Background">
                    <ReadOnlyGrid fields={{
                      mother_name: profile.trainee.mother_name, father_name: profile.trainee.father_name,
                      civil_status: profile.trainee.civil_status, highest_education: profile.trainee.highest_education,
                      employment_status: profile.trainee.employment_status, employment_type: profile.trainee.employment_type,
                      pwd: profile.trainee.pwd,
                    }} className={readOnlyClass} />
                  </Section>
                  {editing && <div className="flex justify-end gap-3">
                    <button type="button" onClick={cancelEdit} className="border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                    <button type="submit" disabled={saving} className="border border-blue-900 bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save changes'}</button>
                  </div>}
                </form>
                <Section title="Change password">
                  <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-3">
                    {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field) => (
                      <label key={field} className="text-sm font-medium text-slate-700">
                        {field === 'currentPassword' ? 'Current password' : field === 'newPassword' ? 'New password' : 'Confirm new password'}
                        <span className="relative mt-1 block">
                          <input
                            type={visiblePasswords[field] ? 'text' : 'password'}
                            required
                            minLength={8}
                            className={`${inputClass} pr-10`}
                            value={password[field]}
                            onChange={(event) => setPassword((current) => ({ ...current, [field]: event.target.value }))}
                          />
                          <button
                            type="button"
                            aria-label={visiblePasswords[field] ? `Hide ${field}` : `Show ${field}`}
                            onClick={() => setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }))}
                            className="absolute right-0 top-1/2 -translate-y-1/2 px-3 text-slate-400 transition hover:text-blue-900"
                          >
                            {visiblePasswords[field] ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                          </button>
                        </span>
                      </label>
                    ))}
                    <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
                      <button type="submit" disabled={saving} className="border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Updating...' : 'Update password'}</button>
                      {passwordFeedback && (
                        <p className={passwordFeedback.type === 'error' ? 'text-sm text-red-700' : 'text-sm text-green-700'} role="status">
                          {passwordFeedback.text}
                        </p>
                      )}
                    </div>
                  </form>
                </Section>
                <p className="text-xs text-slate-500">Registrar-controlled information is read-only. Contact the registrar to change this information.</p>
              </div>
            ) : null}
          </div>
        </main>
      </div>
      <Footer />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="mb-5 text-lg font-bold text-slate-950">{title}</h2><div className="space-y-5">{children}</div></section>
}

function ReadOnlyGrid({ fields, className }: { fields: Record<string, unknown>; className: string }) {
  return <div className="grid gap-4 sm:grid-cols-2">{Object.entries(fields).map(([key, value]) => <div key={key}><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{labels[key] ?? key}</p><p className={className}>{formatValue(value)}</p></div>)}</div>
}
