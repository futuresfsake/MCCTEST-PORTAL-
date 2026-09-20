import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'

import ProgramsTable, {
  type Program,
} from './ProgramsTable'

import ProgramFormModal, {
  type ProgramFormData,
} from './ProgramFormModal'

const API_URL =
  import.meta.env.VITE_API_URL ??
  'http://localhost:3000/api'

type ProgramsResponse = {
  data: Program[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/*
 * TEMPORARY API HELPER
 *
 * We will connect this to AuthContext once we see the
 * existing access-token/session-token storage.
 */
async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  const accessToken =
    localStorage.getItem('accessToken')

  const sessionToken =
    localStorage.getItem('sessionToken')

  const headers = new Headers(options.headers)

  headers.set('Content-Type', 'application/json')

  if (accessToken) {
    headers.set(
      'Authorization',
      `Bearer ${accessToken}`,
    )
  }

  if (sessionToken) {
    headers.set(
      'X-Session-Token',
      sessionToken,
    )
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    },
  )

  if (!response.ok) {
    const error = await response.json().catch(() => null)

    throw new Error(
      error?.message ??
        'Something went wrong while communicating with the server.',
    )
  }

  return response.json()
}

function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])

  // Search input value
  const [search, setSearch] = useState('')

  // Debounced search value used for API requests
  const [searchQuery, setSearchQuery] = useState('')

  const [status, setStatus] = useState('')

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] =
    useState<Program | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const [formError, setFormError] = useState('')

  const [successMessage, setSuccessMessage] =
    useState('')

  const searchTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null)

  const limit = 10

  const fetchPrograms = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }

      if (status) {
        params.set('status', status)
      }

      const response: ProgramsResponse =
        await apiFetch(
          `/api/admin/programs?${params.toString()}`,
        )

      setPrograms(response.data)
      setTotal(response.meta.total)
      setTotalPages(response.meta.totalPages)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load programs.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [page, searchQuery, status])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

  /*
   * Clean up the search timeout when the component
   * is unmounted.
   */
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  /*
   * Automatically hide success messages after 4 seconds.
   */
  useEffect(() => {
    if (!successMessage) return

    const timeout = setTimeout(() => {
      setSuccessMessage('')
    }, 4000)

    return () => clearTimeout(timeout)
  }, [successMessage])

  /*
   * Debounced search.
   *
   * The input updates immediately, but the API query
   * only updates after the user stops typing for 400ms.
   */
  const handleSearch = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value

    setSearch(value)
    setPage(1)

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value)
    }, 400)
  }

  const handleClearSearch = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    setSearch('')
    setSearchQuery('')
    setPage(1)
  }

  const handleStatusChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setStatus(event.target.value)
    setPage(1)
  }

  const handleAdd = () => {
    setSelectedProgram(null)
    setFormError('')
    setModalOpen(true)
  }

  const handleEdit = (program: Program) => {
    setSelectedProgram(program)
    setFormError('')
    setModalOpen(true)
  }

  const handleSave = async (
    formData: ProgramFormData,
  ) => {
    setIsSaving(true)
    setFormError('')
    setSuccessMessage('')

    try {
      const payload = {
        ...formData,
        description:
          formData.description || undefined,
        total_training_hours:
          formData.total_training_hours,
        approx_months:
          formData.approx_months || undefined,
      }

      if (selectedProgram) {
        await apiFetch(
          `/api/admin/programs/${selectedProgram.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
        )

        setSuccessMessage(
          'Training program updated successfully.',
        )
      } else {
        await apiFetch('/api/admin/programs', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setSuccessMessage(
          'Training program created successfully.',
        )
      }

      setModalOpen(false)
      setSelectedProgram(null)
      setFormError('')

      await fetchPrograms()
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Failed to save program.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleStatus = async (
    program: Program,
  ) => {
    const action = program.is_active
      ? 'archive'
      : 'restore'

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${program.name}"?`,
    )

    if (!confirmed) return

    setIsUpdating(true)
    setError('')
    setSuccessMessage('')

    try {
      await apiFetch(
        `/api/admin/programs/${program.id}/status`,
        {
          method: 'PATCH',
        },
      )

      setSuccessMessage(
        program.is_active
          ? `"${program.name}" was archived successfully.`
          : `"${program.name}" was restored successfully.`,
      )

      await fetchPrograms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update program status.',
      )
    } finally {
      setIsUpdating(false)
    }
  }

  const firstItem =
    total === 0 ? 0 : (page - 1) * limit + 1

  const lastItem =
    Math.min(page * limit, total)

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">

      <Header />

      <div className="relative flex min-h-0 flex-1">

        <Sidebar variant="admin" />

        <main className="min-w-0 flex-1">

          {/* PAGE INTRO */}

          <section className="border-b border-slate-200 bg-white">

            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">

              <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">

                <div>

                  <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                    Administration
                  </p>

                  <h1 className="text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                    Training Programs
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                    Manage the training programs offered by
                    MCCTEST, including accreditation,
                    training duration, schedules, and
                    program identification.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  className="shrink-0 bg-blue-900 px-5 py-3 text-xs font-semibold text-white transition hover:bg-blue-950"
                >
                  <i className="fa-solid fa-plus mr-2 text-[9px]" />
                  Add Program
                </button>

              </div>

            </div>

          </section>

          {/* PROGRAM MANAGEMENT */}

          <section className="border-b border-slate-200 bg-slate-50">

            <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">

              <div className="mb-8">

                <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-800">
                  Program Management
                </p>

                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">

                  <div>

                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                      Available programs
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                      {total} program{total === 1 ? '' : 's'} in the system.
                    </p>

                  </div>

                </div>

              </div>

              {/* FILTERS */}

              <div className="mb-6 flex flex-col gap-3 border-y border-slate-200 bg-white p-4 md:flex-row">

                <div className="relative min-w-0 flex-1">

                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />

                  <input
                    value={search}
                    onChange={handleSearch}
                    placeholder="Search by program name or code..."
                    className="w-full border border-slate-200 py-2.5 pl-9 pr-9 text-xs outline-none transition focus:border-blue-900"
                  />

                  {search && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-900"
                    >
                      <i className="fa-solid fa-xmark text-xs" />
                    </button>
                  )}

                </div>

                <select
                  value={status}
                  onChange={handleStatusChange}
                  className="border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 outline-none transition focus:border-blue-900"
                >
                  <option value="">
                    All Status
                  </option>

                  <option value="active">
                    Active
                  </option>

                  <option value="archived">
                    Archived
                  </option>
                </select>

              </div>

              {/* SUCCESS MESSAGE */}

              {successMessage && (
                <div className="mb-6 flex items-start gap-3 border-l-4 border-green-600 bg-green-50 px-4 py-3">

                  <i className="fa-solid fa-circle-check mt-0.5 text-xs text-green-700" />

                  <div>
                    <p className="text-xs font-semibold text-green-800">
                      Action completed
                    </p>

                    <p className="mt-0.5 text-xs text-green-700">
                      {successMessage}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSuccessMessage('')
                    }
                    className="ml-auto text-green-600 transition hover:text-green-900"
                    aria-label="Dismiss notification"
                  >
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>

                </div>
              )}

              {/* PAGE ERROR */}

              {error && (
                <div className="mb-6 border-l-4 border-red-600 bg-red-50 px-4 py-4">

                  <p className="text-xs font-semibold text-red-800">
                    Unable to complete request
                  </p>

                  <p className="mt-1 text-xs text-red-700">
                    {error}
                  </p>

                </div>
              )}

              {/* TABLE */}

              <div className="bg-white">

                {isLoading ? (
                  <div className="border-y border-slate-200 px-6 py-16 text-center">

                    <i className="fa-solid fa-spinner fa-spin text-lg text-blue-900" />

                    <p className="mt-4 text-xs font-medium text-slate-500">
                      Loading programs...
                    </p>

                  </div>
                ) : (
                  <ProgramsTable
                    programs={programs}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    isUpdating={isUpdating}
                  />
                )}

              </div>

              {/* PAGINATION */}

              {!isLoading && (
                <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                  <p className="text-xs text-slate-400">
                    {total > 0 ? (
                      <>
                        Showing{' '}
                        <span className="font-semibold text-slate-600">
                          {firstItem}–{lastItem}
                        </span>{' '}
                        of{' '}
                        <span className="font-semibold text-slate-600">
                          {total}
                        </span>{' '}
                        program{total === 1 ? '' : 's'}
                      </>
                    ) : (
                      'No programs to display'
                    )}
                  </p>

                  <div className="flex gap-2">

                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage((current) =>
                          Math.max(1, current - 1),
                        )
                      }
                      className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <i className="fa-solid fa-arrow-left mr-2 text-[9px]" />
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((current) =>
                          Math.min(
                            totalPages,
                            current + 1,
                          ),
                        )
                      }
                      className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                      <i className="fa-solid fa-arrow-right ml-2 text-[9px]" />
                    </button>

                  </div>

                </div>
              )}

            </div>

          </section>

        </main>

      </div>

      <Footer />

      <ProgramFormModal
        open={modalOpen}
        program={selectedProgram}
        onClose={() => {
          if (!isSaving) {
            setModalOpen(false)
            setSelectedProgram(null)
            setFormError('')
          }
        }}
        onSubmit={handleSave}
        isSaving={isSaving}
        error={formError}
      />

    </div>
  )
}

export default AdminProgramsPage