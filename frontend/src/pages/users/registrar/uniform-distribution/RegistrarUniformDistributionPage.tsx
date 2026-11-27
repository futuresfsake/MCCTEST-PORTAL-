
import { useEffect, useMemo, useState } from 'react'
import Header from '../../../../components/layout/Header'
import Sidebar from '../../../../components/layout/Sidebar'
import Footer from '../../../../components/layout/Footer'
import { Pagination } from '../../../../components/common/Pagination'
import { getRequirementFilterOptions } from '../../../../api/requirements.api'
import { uniformDistributionApi } from '../../../../api/uniform-distribution.api'
import DistributeUniformDialog from './DistributeUniformDialog'
import type {
  UniformDistributionItem,
  UniformDistributionListResponse,
  UniformStatusFilter,
} from '../../../../types/uniform-distribution.type'

interface FilterOptions {
  programs: { id: string; name: string }[]
  batches: { id: string; name: string; programId: string }[]
}

const STATUS_OPTIONS: { value: UniformStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'NOT_GIVEN', label: 'Not given' },
  { value: 'GIVEN', label: 'Given' },
]

const INACTIVE_STATUSES = ['WITHDRAWN', 'DROPPED', 'COMPLETED']

function formatDate(value: string | null) {
  if (!value) return 'N/A'

  return new Date(value).toLocaleDateString()
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default function RegistrarUniformDistributionPage() {
  const [data, setData] = useState<UniformDistributionListResponse | null>(null)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    programs: [],
    batches: [],
  })

  const [status, setStatus] = useState<UniformStatusFilter>('ALL')
  const [programId, setProgramId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<UniformDistributionItem | null>(null)

  const batches = useMemo(
    () =>
      programId
        ? filterOptions.batches.filter(
            (batch) => batch.programId === programId,
          )
        : filterOptions.batches,
    [filterOptions.batches, programId],
  )

  // Debounce search input.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [searchInput])

  // Load program and batch filter options.
  useEffect(() => {
    let active = true

    getRequirementFilterOptions('registrar')
      .then((options) => {
        if (!active) return

        setFilterOptions({
          programs: options.programs,
          batches: options.batches,
        })
      })
      .catch(() => {
        // The list remains usable even if filter options fail.
      })

    return () => {
      active = false
    }
  }, [])

  // Load the distribution list whenever a filter or page changes.
  useEffect(() => {
    let active = true

    async function loadDistribution() {
      setLoading(true)
      setError('')

      try {
        const result = await uniformDistributionApi.list({
          page,
          limit,
          status,
          programId: programId || undefined,
          batchId: batchId || undefined,
          search: search || undefined,
          includeInactive,
        })

        if (active) {
          setData(result)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load uniform distribution records.',
          )
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDistribution()

    return () => {
      active = false
    }
  }, [page, limit, status, programId, batchId, search, includeInactive, reloadKey])

  function handleDistributionSuccess(
    enrollmentId: string,
    response: {
      uniformGiven: boolean
      sizeIssued: UniformDistributionItem['sizeIssued']
      dateDistributed: string | null
      inventoryId: string | null
    },
  ) {
    setData((current) => {
      if (!current) return current

      const updatedItem = current.data.find(
        (item) => item.enrollmentId === enrollmentId,
      )

      if (!updatedItem) return current

      const updatedRow: UniformDistributionItem = {
        ...updatedItem,
        uniformGiven: response.uniformGiven,
        sizeIssued: response.sizeIssued,
        dateDistributed: response.dateDistributed,
        inventoryId: response.inventoryId,
      }

      const shouldRemove =
        status === 'NOT_GIVEN' && response.uniformGiven

      return {
        ...current,
        data: shouldRemove
          ? current.data.filter(
              (item) => item.enrollmentId !== enrollmentId,
            )
          : current.data.map((item) =>
              item.enrollmentId === enrollmentId ? updatedRow : item,
            ),
        pagination: {
          ...current.pagination,
          total: shouldRemove
            ? Math.max(0, current.pagination.total - 1)
            : current.pagination.total,
          totalPages: Math.ceil(
            (shouldRemove
              ? Math.max(0, current.pagination.total - 1)
              : current.pagination.total) / limit,
          ),
        },
        counts: {
          given: current.counts.given + 1,
          waiting: Math.max(0, current.counts.waiting - 1),
        },
      }
    })

    setSelectedEnrollment(null)
  }

  function changeProgram(value: string) {
    setProgramId(value)
    setBatchId('')
    setPage(1)
  }

  function changeBatch(value: string) {
    setBatchId(value)
    setPage(1)
  }

  function changeStatus(value: UniformStatusFilter) {
    setStatus(value)
    setPage(1)
  }

  function changeInactive(value: boolean) {
    setIncludeInactive(value)
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <div className="flex min-h-[calc(100vh-64px)]">
        <Sidebar variant="registrar" />

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-800">
                Registrar
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Uniform Distribution
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Track uniform distribution and record uniforms handed out to
                enrolled trainees.
              </p>
            </div>

            {/* Distribution counts */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Uniforms Given
                </p>
                <p className="mt-2 text-3xl font-bold text-green-700">
                  {data?.counts.given ?? 0}
                </p>
              </div>

              <div className="border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-500">
                  Waiting for Distribution
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-600">
                  {data?.counts.waiting ?? 0}
                </p>
              </div>
            </div>

            {/* Filters */}
            <section className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-900">
                  Filter Records
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Search by trainee name or ID card number.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label
                    htmlFor="distribution-search"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Search trainee
                  </label>
                  <input
                    id="distribution-search"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder="Name or ID card number"
                    className="w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="distribution-status"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Uniform status
                  </label>
                  <select
                    id="distribution-status"
                    value={status}
                    onChange={(event) =>
                      changeStatus(event.target.value as UniformStatusFilter)
                    }
                    className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="distribution-program"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Program
                  </label>
                  <select
                    id="distribution-program"
                    value={programId}
                    onChange={(event) => changeProgram(event.target.value)}
                    className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="">All programs</option>
                    {filterOptions.programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="distribution-batch"
                    className="mb-1.5 block text-sm font-medium text-slate-700"
                  >
                    Batch
                  </label>
                  <select
                    id="distribution-batch"
                    value={batchId}
                    onChange={(event) => changeBatch(event.target.value)}
                    disabled={batches.length === 0}
                    className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm disabled:bg-slate-100"
                  >
                    <option value="">All batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="mt-4 flex w-fit cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => changeInactive(event.target.checked)}
                  className="h-4 w-4 accent-blue-900"
                />
                Include inactive enrollments
              </label>
            </section>

            {/* Distribution table */}
            <section className="overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Trainee Distribution Records
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review enrollment details and distribution status.
                  </p>
                </div>

                <span className="text-sm text-slate-500">
                  {data?.pagination.total ?? 0} records
                </span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="m-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setReloadKey((current) => current + 1)}
                    className="mt-2 font-semibold underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loading ? (
                <div className="p-10 text-center text-sm text-slate-500">
                  Loading distribution records...
                </div>
              ) : !error && data && data.data.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="font-medium text-slate-700">
                    No distribution records found.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Try changing your filters or search terms.
                  </p>
                </div>
              ) : !error && data ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3 font-semibold">Trainee</th>
                          <th className="px-5 py-3 font-semibold">ID Card</th>
                          <th className="px-5 py-3 font-semibold">Program / Batch</th>
                          <th className="px-5 py-3 font-semibold">Enrollment</th>
                          <th className="px-5 py-3 font-semibold">Size</th>
                          <th className="px-5 py-3 font-semibold">Uniform</th>
                          <th className="px-5 py-3 text-right font-semibold">Action</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {data.data.map((item) => {
                          const inactive =
                            item.isInactive ||
                            INACTIVE_STATUSES.includes(item.enrollmentStatus)

                          const canDistribute =
                            item.enrollmentStatus === 'ENROLLED' &&
                            !item.uniformGiven &&
                            !inactive

                          return (
                            <tr
                              key={item.enrollmentId}
                              className={
                                inactive
                                  ? 'bg-slate-50 text-slate-400'
                                  : 'hover:bg-slate-50'
                              }
                            >
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">
                                  {item.traineeName}
                                </p>
                                {item.systemId && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {item.systemId}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4 text-slate-600">
                                {item.idCardNumber || 'N/A'}
                              </td>

                              <td className="px-5 py-4">
                                <p className="font-medium text-slate-800">
                                  {item.programName}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                  {item.batchName}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="text-xs font-medium text-slate-600">
                                  {statusLabel(item.enrollmentStatus)}
                                </span>
                                {inactive && (
                                  <span className="ml-2 inline-flex rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    Inactive
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-slate-700">
                                  {item.enrollmentSize || 'N/A'}
                                </p>
                                {item.sizeIssued && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    Issued: {item.sizeIssued}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                {item.uniformGiven ? (
                                  <div>
                                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                                      Given
                                    </span>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {formatDate(item.dateDistributed)}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                    Not given
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-4 text-right">
                                {canDistribute ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedEnrollment(item)}
                                    className="bg-blue-900 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800"
                                  >
                                    Mark as Given
                                  </button>
                                ) : item.uniformGiven ? (
                                  <span className="text-xs font-medium text-green-700">
                                    Distributed
                                  </span>
                                ) : inactive ? (
                                  <span className="text-xs text-slate-400">
                                    No action
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Not eligible
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-200 px-5 py-4">
                    <Pagination
                      page={data.pagination.page}
                      limit={data.pagination.limit}
                      total={data.pagination.total}
                      totalPages={data.pagination.totalPages}
                      onPageChange={setPage}
                      onLimitChange={(value: number) => {
                        setLimit(value)
                        setPage(1)
                      }}
                    />
                  </div>
                </>
              ) : null}
            </section>
          </div>
        </main>
      </div>

      <Footer />

      {selectedEnrollment && (
        <DistributeUniformDialog
          enrollment={selectedEnrollment}
          onClose={() => setSelectedEnrollment(null)}
          onDistributed={(response) =>
            handleDistributionSuccess(selectedEnrollment.enrollmentId, response)
          }
        />
      )}
    </div>
  )
}
