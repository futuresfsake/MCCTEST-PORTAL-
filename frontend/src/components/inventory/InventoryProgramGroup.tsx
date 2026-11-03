import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  getInventory,
  type InventoryItem,
  type InventorySummary,
} from '../../api/inventory.api'

export type InventoryRowAction = 'restock' | 'adjust' | 'history'

interface Props {
  program: InventorySummary
  expanded: boolean
  onToggle: () => void
  /** Changing this value reloads the sizes of an open program, for example after a restock. */
  refreshKey: number
  onAction: (action: InventoryRowAction, item: InventoryItem) => void
}

const DEFAULT_ITEM_NAME = 'Uniform Shirt'

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
  if (level === 'out_of_stock') return 'bg-red-50 text-red-700 ring-red-200'
  if (level === 'low_stock') return 'bg-amber-50 text-amber-800 ring-amber-200'
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

/**
 * One program in the inventory list. The header shows the program's totals.
 * Opening it loads that program's size rows, so the page never has to show
 * every program and size at once.
 */
export default function InventoryProgramGroup({
  program,
  expanded,
  onToggle,
  refreshKey,
  onAction,
}: Props) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Only the newest request may update the rows, so a slow answer cannot
  // replace the result of a newer reload.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError('')

    try {
      const result = await getInventory({
        programId: program.program_id,
        limit: 100,
        sortBy: 'size',
        sortOrder: 'asc',
      })

      if (id !== requestId.current) return
      setItems(result.data)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Unable to load the sizes.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [program.program_id])

  useEffect(() => {
    if (expanded) void load()
  }, [expanded, load, refreshKey])

  const bodyId = `inventory-program-${program.program_id}`

  return (
    <li className="border-b border-slate-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <span className="min-w-0">
          <span className="block truncate font-semibold text-slate-900">
            {program.program_name}
          </span>
          <span className="mt-1 block text-xs text-slate-500">
            {program.total_items} sizes · {program.total_units.toLocaleString()} units in stock
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-3">
          {program.out_of_stock_items > 0 && (
            <span className="bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200">
              {program.out_of_stock_items} out
            </span>
          )}
          {program.low_stock_items > 0 && (
            <span className="bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
              {program.low_stock_items} low
            </span>
          )}
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {expanded && (
        <div id={bodyId} className="border-t border-slate-100 bg-slate-50/50">
          {error && (
            <p role="alert" className="px-5 py-4 text-sm text-red-700">
              {error}{' '}
              <button type="button" onClick={() => void load()} className="font-semibold underline">
                Try again
              </button>
            </p>
          )}

          {loading && items.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Loading sizes...</p>
          ) : (
            !error && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Size</th>
                      <th className="px-5 py-3">Quantity</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Last Restocked</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-900">
                          {item.sizes}
                          {item.item_name !== DEFAULT_ITEM_NAME && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              {item.item_name}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex whitespace-nowrap px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${stockStyle(item.stock_level)}`}
                          >
                            {stockLabel(item.stock_level)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">
                          {item.last_restocked_at ? formatDate(item.last_restocked_at) : 'Never'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => onAction('restock', item)}
                              className="font-semibold text-blue-800 hover:underline"
                            >
                              Restock
                            </button>
                            <button
                              type="button"
                              onClick={() => onAction('adjust', item)}
                              className="font-semibold text-slate-600 hover:underline"
                            >
                              Adjust
                            </button>
                            <button
                              type="button"
                              onClick={() => onAction('history', item)}
                              className="font-semibold text-slate-600 hover:underline"
                            >
                              History
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                          No sizes yet for this program. Use "Add Item" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </li>
  )
}
