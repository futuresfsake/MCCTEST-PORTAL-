import { useEffect, useState } from 'react'
import type {
  Program,
  ProgramSchedule,
} from './ProgramsTable'

type ProgramFormModalProps = {
  open: boolean
  program: Program | null
  onClose: () => void
  onSubmit: (data: ProgramFormData) => Promise<void>
  isSaving: boolean
  error: string
}

export type ProgramFormData = {
  name: string
  program_code: string
  description: string
  is_accredited: boolean
  total_training_hours: number | undefined
  approx_months: string
  control_number_prefix: string
  schedules: ProgramSchedule[]
}

const DAYS = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
]

const emptySchedule = (): ProgramSchedule => ({
  schedule_name: '',
  days: [],
  start_time: '08:00:00',
  end_time: '17:00:00',
})

function ProgramFormModal({
  open,
  program,
  onClose,
  onSubmit,
  isSaving,
  error,
}: ProgramFormModalProps) {
  const [name, setName] = useState('')
  const [programCode, setProgramCode] = useState('')
  const [description, setDescription] = useState('')
  const [isAccredited, setIsAccredited] = useState(false)
  const [trainingHours, setTrainingHours] = useState('')
  const [approxMonths, setApproxMonths] = useState('')
  const [controlNumberPrefix, setControlNumberPrefix] = useState('')
  const [schedules, setSchedules] = useState<ProgramSchedule[]>([])

  useEffect(() => {
    if (!open) return

    if (program) {
      setName(program.name)
      setProgramCode(program.program_code)
      setDescription(program.description ?? '')
      setIsAccredited(program.is_accredited)
      setTrainingHours(
        program.total_training_hours?.toString() ?? '',
      )
      setApproxMonths(program.approx_months ?? '')
      setControlNumberPrefix(program.control_number_prefix)

      setSchedules(
        program.program_schedule.map((schedule) => ({
          ...schedule,
          start_time: schedule.start_time.includes('T')
            ? schedule.start_time.slice(11, 19)
            : schedule.start_time,
          end_time: schedule.end_time.includes('T')
            ? schedule.end_time.slice(11, 19)
            : schedule.end_time,
        })),
      )
    } else {
      setName('')
      setProgramCode('')
      setDescription('')
      setIsAccredited(false)
      setTrainingHours('')
      setApproxMonths('')
      setControlNumberPrefix('')
      setSchedules([])
    }
  }, [open, program])

  if (!open) return null

  const updateSchedule = (
    index: number,
    updates: Partial<ProgramSchedule>,
  ) => {
    setSchedules((current) =>
      current.map((schedule, scheduleIndex) =>
        scheduleIndex === index
          ? { ...schedule, ...updates }
          : schedule,
      ),
    )
  }

  const toggleDay = (index: number, day: string) => {
    const schedule = schedules[index]

    if (!schedule) return

    const days = schedule.days.includes(day)
      ? schedule.days.filter((item) => item !== day)
      : [...schedule.days, day]

    updateSchedule(index, { days })
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    await onSubmit({
      name: name.trim(),
      program_code: programCode.trim(),
      description: description.trim(),
      is_accredited: isAccredited,
      total_training_hours: trainingHours
        ? Number(trainingHours)
        : undefined,
      approx_months: approxMonths.trim(),
      control_number_prefix:
        controlNumberPrefix.trim(),
      schedules: schedules.map((schedule) => ({
        ...schedule,
        schedule_name:
          schedule.schedule_name.trim(),
        start_time:
          schedule.start_time.length === 5
            ? `${schedule.start_time}:00`
            : schedule.start_time,
        end_time:
          schedule.end_time.length === 5
            ? `${schedule.end_time}:00`
            : schedule.end_time,
      })),
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 px-4 py-6">

      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col bg-white shadow-2xl">

        {/* Header */}

        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-6 py-5">

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
              {program ? 'Edit program' : 'New program'}
            </p>

            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
              {program
                ? 'Update training program'
                : 'Add training program'}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex h-9 w-9 items-center justify-center text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <i className="fa-solid fa-xmark" />
          </button>

        </div>

        {/* Form */}

        <form
          onSubmit={handleSubmit}
          className="min-h-0 overflow-y-auto"
        >

          <div className="space-y-10 px-6 py-7">

            {/* Basic information */}

            <section>

              <div className="mb-5">

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
                  Program information
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Basic information used throughout the training portal.
                </p>

              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                <label className="block">

                  <span className="text-xs font-semibold text-slate-700">
                    Program Name
                  </span>

                  <input
                    required
                    maxLength={50}
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                    className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-900"
                    placeholder="e.g. Shielded Metal Arc Welding NC II"
                  />

                </label>

                <label className="block">

                  <span className="text-xs font-semibold text-slate-700">
                    Program Code
                  </span>

                  <input
                    required
                    maxLength={20}
                    value={programCode}
                    onChange={(e) =>
                      setProgramCode(e.target.value)
                    }
                    className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase outline-none transition focus:border-blue-900"
                    placeholder="e.g. SMAWNCII"
                  />

                </label>

                <label className="block md:col-span-2">

                  <span className="text-xs font-semibold text-slate-700">
                    Description
                  </span>

                  <textarea
                    value={description}
                    onChange={(e) =>
                      setDescription(e.target.value)
                    }
                    rows={3}
                    className="mt-2 w-full resize-none border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-900"
                    placeholder="Brief description of the training program."
                  />

                </label>

                <label className="block">

                  <span className="text-xs font-semibold text-slate-700">
                    Total Training Hours
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={trainingHours}
                    onChange={(e) =>
                      setTrainingHours(e.target.value)
                    }
                    className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-900"
                    placeholder="e.g. 268"
                  />

                </label>

                <label className="block">

                  <span className="text-xs font-semibold text-slate-700">
                    Approximate Duration
                  </span>

                  <input
                    maxLength={50}
                    value={approxMonths}
                    onChange={(e) =>
                      setApproxMonths(e.target.value)
                    }
                    className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-900"
                    placeholder="e.g. 3 months"
                  />

                </label>

                <label className="block">

                  <span className="text-xs font-semibold text-slate-700">
                    Control Number Prefix
                  </span>

                  <input
                    required
                    maxLength={20}
                    value={controlNumberPrefix}
                    onChange={(e) =>
                      setControlNumberPrefix(
                        e.target.value,
                      )
                    }
                    className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm uppercase outline-none transition focus:border-blue-900"
                    placeholder="e.g. SW"
                  />

                </label>

                <label className="flex items-center gap-3 pt-6">

                  <input
                    type="checkbox"
                    checked={isAccredited}
                    onChange={(e) =>
                      setIsAccredited(e.target.checked)
                    }
                    className="h-4 w-4 accent-blue-900"
                  />

                  <span>

                    <span className="block text-xs font-semibold text-slate-700">
                      TESDA Accredited
                    </span>

                    <span className="block text-[10px] text-slate-400">
                      Mark this program as accredited.
                    </span>

                  </span>

                </label>

              </div>

            </section>

            {/* Schedules */}

            <section>

              <div className="mb-5 flex items-end justify-between gap-4">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-800">
                    Training schedules
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    A program can have multiple schedules.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSchedules((current) => [
                      ...current,
                      emptySchedule(),
                    ])
                  }
                  className="border border-blue-900 px-4 py-2 text-xs font-semibold text-blue-900 transition hover:bg-blue-900 hover:text-white"
                >
                  <i className="fa-solid fa-plus mr-2 text-[9px]" />
                  Add Schedule
                </button>

              </div>

              {schedules.length === 0 ? (
                <div className="border border-dashed border-slate-300 px-6 py-10 text-center">

                  <i className="fa-regular fa-calendar text-xl text-slate-300" />

                  <p className="mt-3 text-xs font-semibold text-slate-600">
                    No schedules added
                  </p>

                  <p className="mt-1 text-[10px] text-slate-400">
                    Add at least one schedule if this program has a fixed training schedule.
                  </p>

                </div>
              ) : (
                <div className="space-y-5">

                  {schedules.map((schedule, index) => (

                    <div
                      key={index}
                      className="border border-slate-200 bg-slate-50 p-5"
                    >

                      <div className="mb-5 flex items-center justify-between">

                        <p className="text-xs font-semibold text-slate-900">
                          Schedule {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setSchedules((current) =>
                              current.filter(
                                (_, i) => i !== index,
                              ),
                            )
                          }
                          className="text-xs font-semibold text-slate-400 transition hover:text-red-700"
                        >
                          Remove
                        </button>

                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                        <label className="block md:col-span-2">

                          <span className="text-xs font-semibold text-slate-700">
                            Schedule Name
                          </span>

                          <input
                            required
                            maxLength={50}
                            value={schedule.schedule_name}
                            onChange={(e) =>
                              updateSchedule(index, {
                                schedule_name:
                                  e.target.value,
                              })
                            }
                            className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-900"
                            placeholder="e.g. Weekday Morning"
                          />

                        </label>

                        <div className="md:col-span-2">

                          <span className="text-xs font-semibold text-slate-700">
                            Training Days
                          </span>

                          <div className="mt-2 flex flex-wrap gap-2">

                            {DAYS.map((day) => {

                              const selected =
                                schedule.days.includes(day)

                              return (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() =>
                                    toggleDay(index, day)
                                  }
                                  className={[
                                    'border px-3 py-2 text-[10px] font-semibold transition',
                                    selected
                                      ? 'border-blue-900 bg-blue-900 text-white'
                                      : 'border-slate-300 bg-white text-slate-500 hover:border-blue-900 hover:text-blue-900',
                                  ].join(' ')}
                                >
                                  {day}
                                </button>
                              )
                            })}

                          </div>

                        </div>

                        <label className="block">

                          <span className="text-xs font-semibold text-slate-700">
                            Start Time
                          </span>

                          <input
                            required
                            type="time"
                            value={schedule.start_time.slice(
                              0,
                              5,
                            )}
                            onChange={(e) =>
                              updateSchedule(index, {
                                start_time:
                                  e.target.value,
                              })
                            }
                            className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-900"
                          />

                        </label>

                        <label className="block">

                          <span className="text-xs font-semibold text-slate-700">
                            End Time
                          </span>

                          <input
                            required
                            type="time"
                            value={schedule.end_time.slice(
                              0,
                              5,
                            )}
                            onChange={(e) =>
                              updateSchedule(index, {
                                end_time:
                                  e.target.value,
                              })
                            }
                            className="mt-2 w-full border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-900"
                          />

                        </label>

                      </div>

                    </div>

                  ))}

                </div>
              )}

            </section>

          </div>

          {/* Form Error */}

          {error && (
            <div className="mx-6 mb-4 border-l-4 border-red-600 bg-red-50 px-4 py-3">

              <p className="text-xs font-semibold text-red-800">
                Unable to complete request
              </p>

              <p className="mt-1 text-xs text-red-700">
                {error}
              </p>

            </div>
          )}

          {/* Footer */}

          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-6 py-4">

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="border border-slate-300 px-5 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-blue-900 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-950 disabled:opacity-50"
            >
              {isSaving
                ? 'Saving...'
                : program
                  ? 'Save Changes'
                  : 'Create Program'}
            </button>

          </div>

        </form>

      </div>

    </div>
  )
}

export default ProgramFormModal