import type { ReactNode } from 'react'

type DashboardSectionProps = {
  eyebrow: string
  title: string
  aside?: ReactNode
  children: ReactNode
}

export function DashboardSection({ eyebrow, title, aside, children }: DashboardSectionProps) {
  return (
    <section className="border border-slate-200 bg-white">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">{eyebrow}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">{title}</h2>
        </div>
        {aside}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  )
}

type EmptyStateProps = {
  icon: string
  title: string
  message: string
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center bg-white text-slate-400">
        <i className={`${icon} text-base`} aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{message}</p>
    </div>
  )
}
