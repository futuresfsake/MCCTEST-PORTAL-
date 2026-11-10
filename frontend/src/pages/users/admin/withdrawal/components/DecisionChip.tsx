import type { StageDecision } from '../../../../../types/withdrawal.type'

const LABELS: Record<StageDecision, string> = {
  PENDING: 'Waiting',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

const CLASSES: Record<StageDecision, string> = {
  PENDING: 'border-slate-200 bg-slate-50 text-slate-600',
  APPROVED: 'border-green-200 bg-green-50 text-green-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-800',
}

/** What the trainer or the registrar decided, as a small badge for the admin's list. */
export default function DecisionChip({ value }: { value: StageDecision }) {
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-semibold ${CLASSES[value]}`}>
      {LABELS[value]}
    </span>
  )
}
