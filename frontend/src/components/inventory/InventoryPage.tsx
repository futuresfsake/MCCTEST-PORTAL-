import { useCallback, useEffect, useState, type FormEvent } from 'react'
import AdminPageShell from '../admin/AdminPageShell'
import InventoryHistoryRow from './InventoryHistoryEntry'
import InventoryStockLogDialog from './InventoryStockLogDialog'
import InventoryAddItemDialog, { INVENTORY_SIZES } from './InventoryAddItemDialog'
import {
  adjustInventory,
  getInventory,
  getInventoryHistory,
  getInventorySummary,
  restockInventory,
  type InventoryHistoryEntry,
  type InventoryItem,
  type InventoryListQuery,
  type InventoryStockFilter,
  type InventorySummary,
} from '../../api/inventory.api'

type ActionType = 'restock' | 'adjust' | 'history'

const PAGE_SIZE = 20

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function stockLabel(level: InventoryItem['stock_level']) {
  if (level === 'out_of_stock') return 'Out of stock'
  if (level === 'low_stock') return 'Low stock'
  return 'In stock'
}

function stockStyle(level: InventoryItem['stock_level']) {
  if (level === 'out_of_stock') {
    return 'bg-red-50 text-red-700 ring-red-200'
  }
  if (level === 'low_stock') {
    return 'bg-amber-50 text-amber-800 ring-amber-200'
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

export type InventoryScope = 'admin' | 'registrar'

interface InventoryPageProps {
  /** Which role's layout to render. Admin and Registrar have the same inventory permissions. */
  scope: InventoryScope
}

/** Shared Uniform Inventory page, rendered by the Admin and Registrar wrappers. */
export default function InventoryPage({ scope }: InventoryPageProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [programId, setProgramId] = useState('')
  const [size, setSize] = useState('')
  const [stockLevel, setStockLevel] =
    useState<InventoryStockFilter>('all')
  const [sortBy, setSortBy] =
    useState<NonNullable<InventoryListQuery['sortBy']>>('program')
  const [sortOrder, setSortOrder] =
    useState<NonNullable<InventoryListQuery['sortOrder']>>('asc')

  const [loading, setLoading] = useState(true)
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
      const data = await getInventorySummary()
      setSummary(data)
    } catch {
      // The list request displays the main page error.
    }
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await getInventory({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        programId: programId || undefined,
        size: size || undefined,
        stockLevel,
        sortBy,
        sortOrder,
      })

      setItems(result.data)
      setTotal(result.meta.total)
      setTotalPages(Math.max(1, result.meta.totalPages))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load inventory.',
      )
    } finally {
      setLoading(false)
    }
  }, [page, search, programId, size, stockLevel, sortBy, sortOrder])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    void loadItems()
  }, [loadItems])

  // Automatically apply search after the user stops typing for 400 ms.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const trimmedSearch = searchInput.trim()

      setSearch((currentSearch) =>
        currentSearch === trimmedSearch ? currentSearch : trimmedSearch,
      )

      setPage(1)
    }, 400)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setProgramId('')
    setSize('')
    setStockLevel('all')
    setSortBy('program')
    setSortOrder('asc')
    setPage(1)
  }

  function toggleSort(
    column: NonNullable<InventoryListQuery['sortBy']>,
  ) {
    if (sortBy === column) {
      setSortOrder((current) => current === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
    setPage(1)
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
      await Promise.all([loadItems(), loadSummary()])
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

  const filtersActive = Boolean(
    search || searchInput.trim() || programId || size || stockLevel !== 'all',
  )

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(page * PAGE_SIZE, total)

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
                  {total} record{total === 1 ? '' : 's'} found
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
                  onClick={() => void Promise.all([loadItems(), loadSummary()])}
                  disabled={loading}
                  className="border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 border-b border-slate-200 p-5">
            <div>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by program name..."
                aria-label="Search inventory by program name"
                className="w-full border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-700"
              />
              {searchInput.trim() !== search && (
                <p className="mt-1 text-xs text-slate-500">
                  Searching as you type...
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <select
                value={programId}
                onChange={(event) => {
                  setProgramId(event.target.value)
                  setPage(1)
                }}
                className="border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label="Filter by program"
              >
                <option value="">All programs</option>
                {summary.map((program) => (
                  <option key={program.program_id} value={program.program_id}>
                    {program.program_name}
                  </option>
                ))}
              </select>

              <select
                value={size}
                onChange={(event) => {
                  setSize(event.target.value)
                  setPage(1)
                }}
                className="border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label="Filter by size"
              >
                <option value="">All sizes</option>
                {INVENTORY_SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                value={stockLevel}
                onChange={(event) => {
                  setStockLevel(event.target.value as InventoryStockFilter)
                  setPage(1)
                }}
                className="border border-slate-300 bg-white px-3 py-2 text-sm"
                aria-label="Filter by stock level"
              >
                <option value="all">All stock levels</option>
                <option value="in_stock">In stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
              </select>

              <button
                type="button"
                onClick={clearFilters}
                disabled={!filtersActive && sortBy === 'program' && sortOrder === 'asc'}
                className="border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    <button type="button" onClick={() => toggleSort('program')}>
                      Program {sortBy === 'program' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button type="button" onClick={() => toggleSort('item')}>
                      Item {sortBy === 'item' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button type="button" onClick={() => toggleSort('size')}>
                      Size {sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button type="button" onClick={() => toggleSort('quantity')}>
                      Quantity {sortBy === 'quantity' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                    </button>
                  </th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Last Restocked</th>
                  <th className="px-5 py-3">Last Updated</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                      Loading inventory...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center">
                      <p className="font-semibold text-slate-700">No inventory records found</p>
                      <p className="mt-1 text-slate-500">Try changing your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {item.programs?.name ?? 'Unknown program'}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{item.item_name}</td>
                      <td className="px-5 py-4 text-slate-700">{item.sizes}</td>
                      <td className="px-5 py-4 font-semibold tabular-nums text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex whitespace-nowrap px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${stockStyle(item.stock_level)}`}>
                          {stockLabel(item.stock_level)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {item.last_restocked_at ? formatDate(item.last_restocked_at) : 'Never'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                        {formatDate(item.updated_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openAction('restock', item)} className="font-semibold text-blue-800 hover:underline">
                            Restock
                          </button>
                          <button type="button" onClick={() => openAction('adjust', item)} className="font-semibold text-slate-600 hover:underline">
                            Adjust
                          </button>
                          <button type="button" onClick={() => openAction('history', item)} className="font-semibold text-slate-600 hover:underline">
                            History
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div className="mt-6 flex flex-col justify-between gap-4 px-5 pb-5 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-400">
                {total > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-slate-600">
                      {firstItem}–{lastItem}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-slate-600">{total}</span>{' '}
                    inventory record{total === 1 ? '' : 's'}
                  </>
                ) : (
                  'No inventory records to display'
                )}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <i className="fa-solid fa-arrow-left mr-2 text-[9px]" />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-blue-900 hover:text-blue-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <i className="fa-solid fa-arrow-right ml-2 text-[9px]" />
                </button>
              </div>
            </div>
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
              void Promise.all([loadItems(), loadSummary()])
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