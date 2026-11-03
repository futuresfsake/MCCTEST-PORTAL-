import { useEffect, useState, type FormEvent } from 'react'
import { createInventory } from '../../api/inventory.api'
import { INVENTORY_SIZES } from './inventory.constants'

interface Props {
  programs: { id: string; name: string }[]
  onClose: () => void
  /** Called after the item is saved, so the page can reload its list. */
  onCreated: () => void
}

/** Add a stock row for a program and size, with a starting quantity. */
export default function InventoryAddItemDialog({ programs, onClose, onCreated }: Props) {
  const [programId, setProgramId] = useState('')
  const [size, setSize] = useState<string>(INVENTORY_SIZES[0])
  const [quantity, setQuantity] = useState('0')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = Number(quantity)

    if (!programId) {
      setError('Choose a program.')
      return
    }

    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Starting quantity must be a whole number, zero or more.')
      return
    }

    setSaving(true)
    setError('')

    try {
      await createInventory({ program_id: programId, sizes: size, quantity: parsed })
      onCreated()
    } catch (err) {
      // A duplicate program + size comes back as "This item already exists, restock it instead."
      setError(err instanceof Error ? err.message : 'Unable to add the item.')
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
        aria-labelledby="add-item-title"
        className="my-auto w-full max-w-md border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 id="add-item-title" className="text-lg font-bold text-slate-900">
              Add Item
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Add a uniform stock row for a program and size.
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
            <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="add-item-program" className="mb-2 block text-sm font-semibold text-slate-700">
              Program
            </label>
            <select
              id="add-item-program"
              required
              value={programId}
              onChange={(event) => setProgramId(event.target.value)}
              className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">Select a program</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="add-item-size" className="mb-2 block text-sm font-semibold text-slate-700">
                Size
              </label>
              <select
                id="add-item-size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="w-full border border-slate-300 bg-white px-3 py-2.5 text-sm"
              >
                {INVENTORY_SIZES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="add-item-quantity" className="mb-2 block text-sm font-semibold text-slate-700">
                Starting quantity
              </label>
              <input
                id="add-item-quantity"
                type="number"
                min={0}
                step="1"
                required
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="w-full border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-700"
              />
            </div>
          </div>

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
              disabled={saving}
              className="bg-blue-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Item'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
