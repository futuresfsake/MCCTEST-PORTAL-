import { useEffect, useState, type FormEvent } from 'react'
import { getUniformAvailability } from '../../../../api/inventory.api'
import { uniformDistributionApi } from '../../../../api/uniform-distribution.api'
import { INVENTORY_SIZES } from '../../../../components/inventory/inventory.constants'
import type {
  DistributeUniformResponse,
  UniformDistributionItem,
  UniformSize,
} from '../../../../types/uniform-distribution.type'

interface Props {
  enrollment: UniformDistributionItem
  onClose: () => void
  onDistributed: (response: DistributeUniformResponse) => void
}

export default function DistributeUniformDialog({
  enrollment,
  onClose,
  onDistributed,
}: Props) {
  const [size, setSize] = useState<UniformSize | ''>('')
  const [availability, setAvailability] = useState<number | null>(null)
  const [checkingStock, setCheckingStock] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [stockError, setStockError] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  useEffect(() => {
    if (!size) {
      setAvailability(null)
      setStockError('')
      return
    }

    const controller = new AbortController()

    async function checkAvailability() {
      setCheckingStock(true)
      setAvailability(null)
      setStockError('')

      try {
        const result = await getUniformAvailability(
          enrollment.programId,
          size,
          controller.signal,
        )

        setAvailability(result.available_quantity)
      } catch (err) {
        if (controller.signal.aborted) return

        setStockError(
          err instanceof Error
            ? err.message
            : 'Unable to check uniform availability.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setCheckingStock(false)
        }
      }
    }

    void checkAvailability()

    return () => controller.abort()
  }, [enrollment.programId, size])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!size || availability === null || availability <= 0) return

    setSaving(true)
    setError('')

    try {
      const response = await uniformDistributionApi.distribute(
        enrollment.enrollmentId,
        { size },
      )

      onDistributed(response)
      onClose()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to distribute the uniform.',
      )
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribute-uniform-title"
        className="my-auto w-full max-w-md border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2
              id="distribute-uniform-title"
              className="text-lg font-bold text-slate-900"
            >
              Distribute Uniform
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select the actual uniform size to issue to this trainee.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close dialog"
            className="px-2 text-xl text-slate-500 hover:text-slate-900 disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5 p-6">
          {error && (
            <p
              role="alert"
              className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              Trainee
            </p>
            <p className="text-sm text-slate-900">
              {enrollment.traineeName}
            </p>
            <p className="text-xs text-slate-500">
              ID Card: {enrollment.idCardNumber || 'Not available'}
            </p>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Enrollment details
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {enrollment.programName}
            </p>
            <p className="text-sm text-slate-600">
              {enrollment.batchName}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Enrollment size:{' '}
              <span className="font-semibold text-slate-900">
                {enrollment.enrollmentSize || 'Not specified'}
              </span>
              <span className="ml-1 text-xs text-slate-500">
                (Reference only)
              </span>
            </p>
          </div>

          <div>
            <label
              htmlFor="distribution-size"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Actual size to issue
            </label>

            <select
              id="distribution-size"
              required
              value={size}
              disabled={saving}
              onChange={(event) => {
                setSize(event.target.value as UniformSize | '')
                setError('')
              }}
              className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select uniform size</option>
              {INVENTORY_SIZES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {size && (
            <div
              aria-live="polite"
              className="border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <p className="text-sm font-semibold text-slate-700">
                Stock availability for size {size}
              </p>

              {checkingStock && (
                <p className="mt-1 text-sm text-slate-500">
                  Checking availability...
                </p>
              )}

              {stockError && (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {stockError}
                </p>
              )}

              {!checkingStock && !stockError && availability !== null && (
                availability > 0 ? (
                  <p className="mt-1 text-sm text-green-700">
                    {availability} {availability === 1 ? 'unit' : 'units'} available
                  </p>
                ) : (
                  <p className="mt-1 text-sm font-semibold text-red-700">
                    Out of stock
                  </p>
                )
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !size ||
                checkingStock ||
                availability === null ||
                availability <= 0 ||
                Boolean(stockError)
              }
              className="bg-blue-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Distributing...' : 'Confirm Distribution'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
