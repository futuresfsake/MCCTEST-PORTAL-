import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getProgramInventoryHistory,
  type InventoryHistoryEntry as HistoryEntry,
  type InventoryHistoryType,
} from '../../api/inventory.api'
import InventoryHistoryEntry from './InventoryHistoryEntry'

interface Props {
  programs: { id: string; name: string }[]
  onClose: () => void
}

const TYPE_OPTIONS: { value: '' | InventoryHistoryType; label: string }[] = [
  { value: '', label: 'All movements' },
  { value: 'RESTOCK', label: 'Restocks' },
  { value: 'DISTRIBUTED', label: 'Distributed' },
  { value: 'ADJUSTMENT', label: 'Adjustments' },
  { value: 'INITIAL', label: 'Opening balances' },
]

function toInputDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Local midnight of a yyyy-mm-dd value as an ISO timestamp. */
function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`).toISOString()
}

/** Local midnight after a yyyy-mm-dd value, so the chosen day is included. */
function startOfNextDay(value: string) {
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + 1)
  return date.toISOString()
}

/** Program-level stock log: every movement across sizes, with filters. */
export default function InventoryStockLogDialog({ programs, onClose }: Props) {
  const [programId, setProgramId] = useState('')
  const [type, setType] = useState<'' | InventoryHistoryType>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Only the newest request may update the list, so a slow answer to an old
  // filter can never replace the results of a newer one.
  const requestId = useRef(0)

  const load = useCallback(
    async (nextCursor: string | null) => {
      const id = ++requestId.current
      setLoading(true)
      setError('')

      try {
        const result = await getProgramInventoryHistory({
          programId: programId || undefined,
          type: type || undefined,
          from: from ? startOfDay(from) : undefined,
          to: to ? startOfNextDay(to) : undefined,
          cursor: nextCursor ?? undefined,
        })

        if (id !== requestId.current) return

        setEntries((current) =>
          nextCursor ? [...current, ...result.data] : result.data,
        )
        setCursor(result.nextCursor)
        setHasMore(result.hasMore)
      } catch (err) {
        if (id !== requestId.current) return
        setError(err instanceof Error ? err.message : 'Unable to load the stock log.')
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    },
    [programId, type, from, to],
  )

  useEffect(() => {
    void load(null)
  }, [load])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function setLastDays(days: number) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (days - 1))
    setFrom(toInputDate(start))
    setTo(toInputDate(end))
  }

  function clearFilters() {
    setProgramId('')
    setType('')
    setFrom('')
    setTo('')
  }

  const filtersActive = Boolean(programId || type || from || to)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-log-title"
        className="my-auto w-full max-w-3xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 id="stock-log-title" className="text-lg font-bold text-slate-900">
              Stock Log
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Every stock movement across programs and sizes, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="px-2 text-xl text-slate-500 hover:text-slate-900"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 border-b border-slate-200 p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              aria-label="Filter by program"
              className="border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>

            <select
              value={type}
              onChange={(event) => setType(event.target.value as '' | InventoryHistoryType)}
              aria-label="Filter by movement type"
              className="border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              From
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(event) => setFrom(event.target.value)}
                className="border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              To
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(event) => setTo(event.target.value)}
                className="border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => setLastDays(7)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Last 7 days
            </button>
            <button
              type="button"
              onClick={() => setLastDays(30)}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Last 30 days
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtersActive}
              className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <p role="alert" className="mb-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {loading && entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading stock log...</p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No stock movements match these filters.
            </p>
          ) : (
            <div className="max-h-[28rem] space-y-3 overflow-y-auto">
              {entries.map((entry) => (
                <InventoryHistoryEntry key={entry.id} entry={entry} showItem />
              ))}
            </div>
          )}

          {hasMore && cursor && (
            <button
              type="button"
              disabled={loading}
              onClick={() => void load(cursor)}
              className="mt-4 w-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
