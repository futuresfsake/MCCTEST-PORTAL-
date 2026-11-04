import type { WithdrawalStatus } from '../../../../../types/withdrawal.type'
import { STATUS_LABELS } from '../withdrawal-pipeline'

const CLASSES: Record<WithdrawalStatus, string> = {
  PENDING_VALIDATION: 'border-amber-200 bg-amber-50 text-amber-800',
  TRAINER_VALIDATED: 'border-sky-200 bg-sky-50 text-sky-800',
  PENDING_ADMIN_SIGNOFF: 'border-indigo-200 bg-indigo-50 text-indigo-800',
  APPROVED: 'border-green-200 bg-green-50 text-green-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
  CANCELLED: 'border-slate-200 bg-slate-50 text-slate-600',
}

export default function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-xs font-semibold ${CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
