import { useCallback, useEffect, useState, type FormEvent } from 'react'
import AdminPageShell from '../admin/AdminPageShell'
import InventoryHistoryRow from './InventoryHistoryEntry'
import InventoryStockLogDialog from './InventoryStockLogDialog'
import InventoryAddItemDialog from './InventoryAddItemDialog'
import InventoryProgramGroup, { type InventoryRowAction } from './InventoryProgramGroup'
import {
  adjustInventory,
  getInventoryHistory,
  getInventorySummary,
  restockInventory,
  type InventoryHistoryEntry,
  type InventoryItem,
  type InventorySummary,
} from '../../api/inventory.api'

type ActionType = InventoryRowAction

/** Which programs the list shows, based on their stock totals. */
type ProgramFilter = 'all' | 'has_stock' | 'low' | 'no_stock'

const PROGRAM_FILTERS: { value: ProgramFilter; label: string }[] = [
  { value: 'all', label: 'All programs' },
  { value: 'has_stock', label: 'Has stock' },
  { value: 'low', label: 'Has low stock' },
  { value: 'no_stock', label: 'No stock yet' },
]

function matchesFilter(program: InventorySummary, filter: ProgramFilter) {
  if (filter === 'has_stock') return program.total_units > 0
  if (filter === 'low') return program.low_stock_items > 0
  if (filter === 'no_stock') return program.total_units === 0
  return true
}

export type InventoryScope = 'admin' | 'registrar'

interface InventoryPageProps {
  /** Which role's layout to render. Admin and Registrar have the same inventory permissions. */
  scope: InventoryScope
}

/** Shared Uniform Inventory page, rendered by the Admin and Registrar wrappers. */
export default function InventoryPage({ scope }: InventoryPageProps) {
  const [summary, setSummary] = useState<InventorySummary[]>([])
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState<ProgramFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  /** Bumped after a change so every open program reloads its sizes. */
  const [refreshKey, setRefreshKey] = useState(0)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [selectedItem, setSelectedItem] =
    useState<InventoryItem | null>(null)
  const [action, setAction] = useState<ActionType | null>(null)
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)

  const [history, setHistory] = useState<InventoryHistoryEntry[]>([])
  const [historyCursor, setHistoryCursor] = useState<string | null>(null)
  const [historyHasMore, setHistoryHasMore] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [stockLogOpen, setStockLogOpen] = useState(false)
  const [addItemOpen, setAddItemOpen] = useState(false)

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getInventorySummary())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load inventory.',
      )
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  /** Reload the program totals and the sizes of every open program. */
  async function refresh() {
    setRefreshKey((current) => current + 1)
    await loadSummary()
  }

  function toggleProgram(programId: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(programId)) next.delete(programId)
      else next.add(programId)
      return next
    })
  }

  function clearFilters() {
    setSearch('')
    setProgramFilter('all')
  }

  function openAction(type: ActionType, item: InventoryItem) {
    setSelectedItem(item)
    setAction(type)
    setQuantity('')
    setReason('')
    setRemarks('')
    setError('')
    setNotice('')

    if (type === 'history') {
      setHistory([])
      setHistoryCursor(null)
      setHistoryHasMore(false)
      void loadHistory(item.id, null, true)
    }
  }

  function closeAction() {
    if (saving) return
    setAction(null)
    setSelectedItem(null)
  }

  async function loadHistory(
    id: string,
    cursor: string | null,
    replace: boolean,
  ) {
    setHistoryLoading(true)
    setError('')

    try {
      const result = await getInventoryHistory(id, cursor)
      setHistory((current) =>
        replace ? result.data : [...current, ...result.data],
      )
      setHistoryCursor(result.nextCursor)
      setHistoryHasMore(result.hasMore)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load stock history.',
      )
    } finally {
      setHistoryLoading(false)
    }
  }

  async function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedItem || !action || action === 'history') return

    const parsedQuantity = Number(quantity)

    if (!Number.isInteger(parsedQuantity)) {
      setError('Enter a whole number.')
      return
    }

    if (action === 'restock' && parsedQuantity <= 0) {
      setError('Restock quantity must be greater than zero.')
      return
    }

    if (action === 'adjust' && parsedQuantity === 0) {
      setError('Adjustment quantity cannot be zero. Use a positive number to add stock or a negative number to remove stock.')
      return
    }

    if (action === 'adjust' && !reason.trim()) {
      setError('Enter a reason for this adjustment.')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (action === 'restock') {
        await restockInventory(selectedItem.id, {
          quantity: parsedQuantity,
          remarks: remarks.trim() || undefined,
        })
        setNotice('Stock restocked successfully.')
      } else {
        await adjustInventory(selectedItem.id, {
          quantity_change: parsedQuantity,
          reason: reason.trim(),
        })
        setNotice('Stock adjustment saved successfully.')
      }

      setAction(null)
      setSelectedItem(null)
      await refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to update stock.',
      )
    } finally {
      setSaving(false)
    }
  }

  const totalUnits = summary.reduce(
    (sum, row) => sum + row.total_units,
    0,
  )
  const totalItems = summary.reduce(
    (sum, row) => sum + row.total_items,
    0,
  )
  const lowStockItems = summary.reduce(
    (sum, row) => sum + row.low_stock_items,
    0,
  )
  const outOfStockItems = summary.reduce(
    (sum, row) => sum + row.out_of_stock_items,
    0,
  )

  const term = search.trim().toLowerCase()
  const visiblePrograms = summary.filter(
    (program) =>
      matchesFilter(program, programFilter) &&
      (!term || program.program_name.toLowerCase().includes(term)),
  )
  const filtersActive = Boolean(term || programFilter !== 'all')
  const allVisibleOpen =
    visiblePrograms.length > 0 &&
    visiblePrograms.every((program) => expanded.has(program.program_id))

  function toggleAllVisible() {
    setExpanded((current) => {
      const next = new Set(current)
      for (const program of visiblePrograms) {
        if (allVisibleOpen) next.delete(program.program_id)
        else next.add(program.program_id)
      }
      return next
    })
  }

  return (
    <AdminPageShell
      variant={scope}
      eyebrow="Supplies"
      title="Uniform Inventory"
      description="Monitor uniform stock by training program and size."
    >
      <div className="space-y-6">
        {notice && (
          <div
            role="status"
            className="flex items-center justify-between border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="font-semibold">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Total Units',
              value: totalUnits,
              note: 'Available uniform quantity',
            },
            {
              label: 'Inventory Records',
              value: totalItems,
              note: 'Program and size combinations',
            },
            {
              label: 'Low Stock',
              value: lowStockItems,
              note: 'Records with 1–5 units',
            },
            {
              label: 'Out of Stock',
              value: outOfStockItems,
              note: 'Records with zero units',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="border border-slate-200 bg-white p-5"
            >
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                {card.value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.note}</p>
            </div>
          ))}
        </div>

        <section className="border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Uniform Stock</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {visiblePrograms.length} of {summary.length} program
                  {summary.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddItemOpen(true)}
                  className="bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => setStockLogOpen(true)}
                  className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Stock Log
                </button>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={summaryLoading}
                  className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by program name..."
              aria-label="Search inventory by program name"
              className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-700 sm:flex-1"
            />
            <select
              value={programFilter}
              onChange={(event) => setProgramFilter(event.target.value as ProgramFilter)}
              aria-label="Filter programs by stock"
              className="border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {PROGRAM_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={visiblePrograms.length === 0}
              className="border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              {allVisibleOpen ? 'Collapse all' : 'Expand all'}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!filtersActive}
              className="border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Clear filters
            </button>
          </div>

          {summaryLoading ? (
            <p className="px-5 py-12 text-center text-slate-500">Loading inventory...</p>
          ) : visiblePrograms.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-slate-700">No programs found</p>
              <p className="mt-1 text-slate-500">Try changing your search or filter.</p>
            </div>
          ) : (
            <ul>
              {visiblePrograms.map((program) => (
                <InventoryProgramGroup
                  key={program.program_id}
                  program={program}
                  expanded={expanded.has(program.program_id)}
                  onToggle={() => toggleProgram(program.program_id)}
                  refreshKey={refreshKey}
                  onAction={openAction}
                />
              ))}
            </ul>
          )}
        </section>

        {action && selectedItem && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAction()
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="inventory-action-title"
              className="my-auto w-full max-w-xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 id="inventory-action-title" className="text-lg font-bold text-slate-900">
                    {action === 'restock'
                      ? 'Restock Uniforms'
                      : action === 'adjust'
                        ? 'Adjust Stock'
                        : 'Stock History'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedItem.programs?.name ?? 'Unknown program'} · Size {selectedItem.sizes}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-700">
                    Current quantity: {selectedItem.quantity}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAction}
                  disabled={saving}
                  aria-label="Close dialog"
                  className="px-2 text-xl text-slate-500 hover:text-slate-900 disabled:opacity-40"
                >
                  ×
                </button>
              </div>

              {action === 'history' ? (
                <div className="p-6">
                  {historyLoading && history.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">Loading stock history...</p>
                  ) : history.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">No stock history available.</p>
                  ) : (
                    <div className="max-h-96 space-y-3 overflow-y-auto">
                      {history.map((entry) => (
                        <InventoryHistoryRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  )}

                  {historyHasMore && historyCursor && (
                    <button
                      type="button"
                      disabled={historyLoading}
                      onClick={() => void loadHistory(selectedItem.id, historyCursor, false)}
                      className="mt-4 w-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                    >
                      {historyLoading ? 'Loading...' : 'Load more history'}
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={submitAction} className="space-y-5 p-6">
                  <div>
                    <label htmlFor="inventory-quantity" className="mb-2 block text-sm font-semibold text-slate-700">
                      {action === 'restock' ? 'Quantity to add' : 'Quantity change'}
                    </label>
                    <input
                      id="inventory-quantity"
                      type="number"
                      min={action === 'restock' ? 1 : undefined}
                      step="1"
                      required
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      placeholder={action === 'restock' ? 'Enter a whole number' : 'Positive to add, negative to remove'}
                      className="w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-700"
                    />
                    {action === 'adjust' && (
                      <p className="mt-2 text-xs text-slate-500">
                        Enter a positive number to add stock or a negative number to remove stock. Stock cannot become negative.
                      </p>
                    )}
                  </div>

                  {action === 'restock' ? (
                    <div>
                      <label htmlFor="inventory-remarks" className="mb-2 block text-sm font-semibold text-slate-700">
                        Remarks (optional)
                      </label>
                      <textarea
                        id="inventory-remarks"
                        rows={3}
                        value={remarks}
                        onChange={(event) => setRemarks(event.target.value)}
                        placeholder="Add a note about this restock"
                        className="w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-700"
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="inventory-reason" className="mb-2 block text-sm font-semibold text-slate-700">
                        Reason for adjustment
                      </label>
                      <textarea
                        id="inventory-reason"
                        rows={3}
                        required
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder="Explain why stock is being adjusted"
                        className="w-full border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-700"
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={closeAction}
                      disabled={saving}
                      className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="bg-blue-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {saving
                        ? 'Saving...'
                        : action === 'restock'
                          ? 'Confirm Restock'
                          : 'Save Adjustment'}
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        )}

        {addItemOpen && (
          <InventoryAddItemDialog
            programs={summary.map((program) => ({
              id: program.program_id,
              name: program.program_name,
            }))}
            onClose={() => setAddItemOpen(false)}
            onCreated={() => {
              setAddItemOpen(false)
              setNotice('Item added successfully.')
              void refresh()
            }}
          />
        )}

        {stockLogOpen && (
          <InventoryStockLogDialog
            programs={summary.map((program) => ({
              id: program.program_id,
              name: program.program_name,
            }))}
            onClose={() => setStockLogOpen(false)}
          />
        )}
      </div>
    </AdminPageShell>
  )
}