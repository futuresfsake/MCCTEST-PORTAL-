import type { Announcement, AnnouncementScope } from '../../api/announcements.api'

type AnnouncementTargetProps = {
  announcement: Pick<
    Announcement,
    'scope' | 'programs' | 'batch'
  >
}

const scopeLabels: Record<AnnouncementScope, string> = {
  GLOBAL: 'Global',
  PROGRAM: 'Program',
  BATCH: 'Batch',
}

export default function AnnouncementTarget({
  announcement,
}: AnnouncementTargetProps) {
  const target =
    announcement.scope === 'GLOBAL'
      ? 'All users'
      : announcement.scope === 'PROGRAM'
        ? announcement.programs?.name ?? 'Program'
        : announcement.batch?.batch_name ?? 'Batch'

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="font-semibold uppercase tracking-[0.12em] text-blue-800">
        {scopeLabels[announcement.scope]}
      </span>
      <span className="text-slate-300">·</span>
      <span className="text-slate-500">{target}</span>
    </div>
  )
}
