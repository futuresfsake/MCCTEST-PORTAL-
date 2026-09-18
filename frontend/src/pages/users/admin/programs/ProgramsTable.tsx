import ProgramStatusBadge from './ProgramStatusBadge'

export type ProgramSchedule = {
  id?: string
  schedule_name: string
  days: string[]
  start_time: string
  end_time: string
}

export type Program = {
  id: string
  name: string
  program_code: string
  description: string | null
  is_accredited: boolean
  is_active: boolean
  total_training_hours: number | string | null
  approx_months: string | null
  control_number_prefix: string
  program_schedule: ProgramSchedule[]
  created_at: string
  updated_by: string
}

type ProgramsTableProps = {
  programs: Program[]
  onEdit: (program: Program) => void
  onToggleStatus: (program: Program) => void
  isUpdating: boolean
}

function formatTime(value: string) {
  if (!value) return '--'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 5)
  }

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatSchedule(schedule: ProgramSchedule) {
  const days = schedule.days.join(', ')

  return `${days} · ${formatTime(schedule.start_time)}–${formatTime(
    schedule.end_time,
  )}`
}

function ProgramsTable({
  programs,
  onEdit,
  onToggleStatus,
  isUpdating,
}: ProgramsTableProps) {
  return (
    <div className="overflow-x-auto border-y border-slate-200">
      <table className="w-full min-w-[950px]">

        <thead>
          <tr className="border-b border-slate-200">

            <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Program
            </th>

            <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Code
            </th>

            <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Schedule
            </th>

            <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Training
            </th>

            <th className="px-4 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Status
            </th>

            <th className="px-4 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Actions
            </th>

          </tr>
        </thead>

        <tbody>

          {programs.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="px-4 py-16 text-center"
              >
                <i className="fa-solid fa-book-open text-2xl text-slate-300" />

                <p className="mt-4 text-sm font-semibold text-slate-700">
                  No programs found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Try changing your search or status filter.
                </p>
              </td>
            </tr>
          ) : (
            programs.map((program) => (
              <tr
                key={program.id}
                className="border-b border-slate-100 transition hover:bg-slate-50"
              >

                <td className="px-4 py-5">
                  <p className="max-w-[280px] text-xs font-semibold text-slate-900">
                    {program.name}
                  </p>

                  {program.description && (
                    <p className="mt-1 max-w-[280px] truncate text-[10px] text-slate-400">
                      {program.description}
                    </p>
                  )}
                </td>

                <td className="px-4 py-5">
                  <span className="text-xs font-semibold text-blue-900">
                    {program.program_code}
                  </span>

                  {program.is_accredited && (
                    <p className="mt-1 text-[10px] text-green-700">
                      TESDA Accredited
                    </p>
                  )}
                </td>

                <td className="px-4 py-5">
                  {program.program_schedule.length === 0 ? (
                    <span className="text-xs text-slate-400">
                      No schedule
                    </span>
                  ) : (
                    <div className="space-y-1">
                      {program.program_schedule.map((schedule) => (
                        <div key={schedule.id ?? schedule.schedule_name}>
                          <p className="text-[10px] font-semibold text-slate-700">
                            {schedule.schedule_name}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            {formatSchedule(schedule)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </td>

                <td className="px-4 py-5">
                  <p className="text-xs font-semibold text-slate-800">
                    {program.total_training_hours ?? '--'}
                    {program.total_training_hours !== null && ' hrs'}
                  </p>

                  {program.approx_months && (
                    <p className="mt-1 text-[10px] text-slate-400">
                      Approx. {program.approx_months}
                    </p>
                  )}
                </td>

                <td className="px-4 py-5">
                  <ProgramStatusBadge
                    isActive={program.is_active}
                  />
                </td>

                <td className="px-4 py-5">
                  <div className="flex justify-end gap-4">

                    <button
                      type="button"
                      onClick={() => onEdit(program)}
                      className="text-xs font-semibold text-blue-900 transition hover:text-blue-950"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onToggleStatus(program)}
                      className="text-xs font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
                    >
                      {program.is_active
                        ? 'Archive'
                        : 'Restore'}
                    </button>

                  </div>
                </td>

              </tr>
            ))
          )}

        </tbody>
      </table>
    </div>
  )
}

export default ProgramsTable