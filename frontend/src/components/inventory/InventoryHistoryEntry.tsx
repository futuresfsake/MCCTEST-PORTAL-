import type { InventoryHistoryEntry as HistoryEntry } from '../../api/inventory.api'

const TYPE_LABEL: Record<HistoryEntry['type'], string> = {
  INITIAL: 'Opening balance',
  RESTOCK: 'Restock',
  DISTRIBUTED: 'Distributed',
  ADJUSTMENT: 'Adjustment',
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  REGISTRAR: 'Registrar',
  TRAINER: 'Trainer',
  ENCODER: 'Encoder',
  TRAINEE: 'Trainee',
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface Props {
  entry: HistoryEntry
  /** Show the program and size, for the program-level log. */
  showItem?: boolean
}

/** One stock movement: what changed, who did it and, for a distribution, who received it. */
export default function InventoryHistoryEntry({ entry, showItem = false }: Props) {
  const actor = entry.users
  const recipient = entry.enrollments?.trainee?.users
  const idCard = entry.enrollments?.id_card_number

  return (
    <div className="border-b border-slate-100 pb-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{TYPE_LABEL[entry.type]}</p>
          {showItem && entry.inventory && (
            <p className="mt-1 text-sm text-slate-700">
              {entry.inventory.programs?.name ?? 'Unknown program'} · Size {entry.inventory.sizes}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {formatDateTime(entry.created_at)}
            {actor && (
              <>
                {' · '}
                {actor.first_name} {actor.last_name}
                <span className="ml-1.5 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {ROLE_LABEL[actor.role] ?? actor.role}
                </span>
              </>
            )}
          </p>
          {entry.type === 'DISTRIBUTED' && recipient && (
            <p className="mt-1 text-sm text-slate-700">
              Given to {recipient.first_name} {recipient.last_name}
              {idCard ? ` · ID ${idCard}` : ''}
            </p>
          )}
          {entry.remarks && <p className="mt-1 text-sm text-slate-600">{entry.remarks}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p
            className={`font-semibold ${
              entry.quantity_change < 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {entry.quantity_change > 0 ? '+' : ''}
            {entry.quantity_change}
          </p>
          <p className="text-xs text-slate-500">Balance: {entry.quantity_after}</p>
        </div>
      </div>
    </div>
  )
}
