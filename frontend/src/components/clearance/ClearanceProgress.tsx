import { Check, Clock, Minus, X } from 'lucide-react'
import type { ClearanceDetail } from '../../types/clearance.type'
import { buildStages, formatDateTime, type StageState } from './clearance-format'

const DOT: Record<StageState, string> = {
  done: 'border-green-600 bg-green-600 text-white',
  current: 'border-blue-700 bg-white text-blue-700',
  rejected: 'border-red-600 bg-red-600 text-white',
  upcoming: 'border-slate-300 bg-white text-slate-400',
  skipped: 'border-slate-200 bg-slate-100 text-slate-400',
}

const STATE_TEXT: Record<StageState, string> = {
  done: 'Done',
  current: 'Current stage',
  rejected: 'Rejected',
  upcoming: 'Not reached yet',
  skipped: 'Not reached',
}

const STATE_TEXT_CLASS: Record<StageState, string> = {
  done: 'text-green-700',
  current: 'text-blue-800',
  rejected: 'text-red-700',
  upcoming: 'text-slate-500',
  skipped: 'text-slate-400',
}

const ICONS: Record<StageState, typeof Check> = {
  done: Check,
  current: Clock,
  rejected: X,
  upcoming: Minus,
  skipped: Minus,
}

/** The stages of a clearance request, in order, with who acted and when. */
export default function ClearanceProgress({ detail }: { detail: ClearanceDetail }) {
  const stages = buildStages(detail)
  return (
    <ol aria-label="Clearance request progress">
      {stages.map((stage, index) => {
        const Icon = ICONS[stage.state]
        return (
          <li
            key={stage.label}
            aria-current={stage.state === 'current' ? 'step' : undefined}
            className="relative flex gap-4 pb-8 last:pb-0"
          >
            {index < stages.length - 1 && (
              <span
                aria-hidden="true"
                className={`absolute left-4 top-9 h-[calc(100%-2.25rem)] w-px -translate-x-1/2 ${
                  stage.state === 'done' ? 'bg-green-300' : 'bg-slate-200'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${DOT[stage.state]}`}
            >
              <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-semibold text-slate-900">{stage.label}</p>
                <p className={`text-xs font-semibold uppercase tracking-wide ${STATE_TEXT_CLASS[stage.state]}`}>
                  {STATE_TEXT[stage.state]}
                </p>
              </div>
              {(stage.actor || stage.at) && (
                <p className="mt-1 text-sm text-slate-600">
                  {[stage.actor, formatDateTime(stage.at)].filter(Boolean).join(' · ')}
                </p>
              )}
              {stage.note && (
                <p className="mt-2 whitespace-pre-wrap break-words border-l-2 border-slate-200 pl-3 text-sm text-slate-600">
                  Reason given: {stage.note}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
