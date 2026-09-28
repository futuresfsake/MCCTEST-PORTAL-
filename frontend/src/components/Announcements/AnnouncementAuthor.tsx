type AnnouncementAuthorProps = {
  role?: string
  firstName?: string
  lastName?: string
  layout?: 'inline' | 'stacked'
}

const roleDetails: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  ADMIN: {
    label: 'Administrator',
    icon: 'fa-solid fa-shield-halved',
    color: 'bg-purple-100 text-purple-800',
  },
  TRAINER: {
    label: 'Trainer',
    icon: 'fa-solid fa-chalkboard-user',
    color: 'bg-blue-100 text-blue-800',
  },
  REGISTRAR: {
    label: 'Registrar',
    icon: 'fa-solid fa-clipboard-list',
    color: 'bg-amber-100 text-amber-800',
  },
  ENCODER: {
    label: 'Encoder',
    icon: 'fa-solid fa-keyboard',
    color: 'bg-teal-100 text-teal-800',
  },
  TRAINEE: {
    label: 'Trainee',
    icon: 'fa-solid fa-user',
    color: 'bg-slate-100 text-slate-700',
  },
}

export default function AnnouncementAuthor({
  role,
  firstName,
  lastName,
  layout = 'inline',
}: AnnouncementAuthorProps) {
  const details = roleDetails[role ?? ''] ?? {
    label: 'Staff',
    icon: 'fa-solid fa-user',
    color: 'bg-slate-100 text-slate-700',
  }
  const name = [firstName, lastName].filter(Boolean).join(' ')

  if (layout === 'stacked') {
    return (
      <div className="flex w-28 shrink-0 flex-col items-center text-center">
        <span
          className={`flex h-10 w-10 items-center justify-center ${details.color}`}
          aria-label={`${details.label} poster`}
          title={`${details.label} poster`}
        >
          <i className={`${details.icon} text-sm`} aria-hidden="true" />
        </span>
        <span className="mt-2 max-w-full truncate text-xs font-semibold text-slate-700">
          {name || details.label}
        </span>
        <span className="mt-0.5 max-w-full truncate text-[10px] text-slate-400">
          {details.label}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span
        className={`flex h-7 w-7 items-center justify-center ${details.color}`}
        aria-label={`${details.label} poster`}
        title={`${details.label} poster`}
      >
        <i className={`${details.icon} text-xs`} aria-hidden="true" />
      </span>
      <p className="text-xs text-slate-500">
        <span className="font-bold uppercase tracking-wide text-slate-700">
          {role ?? 'STAFF'}
        </span>
        <span className="mx-1.5 text-slate-300">—</span>
        Posted by{' '}
        <span className="font-semibold text-slate-700">
          {name || details.label}
        </span>
      </p>
    </div>
  )
}
