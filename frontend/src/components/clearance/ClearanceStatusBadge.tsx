import type { ClearanceStatus } from '../../types/clearance.type'
import { STATUS_LABELS } from './clearance-format'

const CLASSES: Record<ClearanceStatus, string> = {
  PENDING_VALIDATION: 'border-amber-200 bg-amber-50 text-amber-800',
  TRAINER_VALIDATED: 'border-sky-200 bg-sky-50 text-sky-800',
  REGISTRAR_VALIDATED: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  PROCESSED: 'border-violet-200 bg-violet-50 text-violet-800',
  RELEASED: 'border-green-200 bg-green-50 text-green-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
  CANCELLED: 'border-slate-200 bg-slate-50 text-slate-600',
}

export default function ClearanceStatusBadge({ status }: { status: ClearanceStatus }) {
  return (
    <span className={`inline-flex items-center border px-2.5 py-1 text-xs font-semibold ${CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
