import type { ClearanceFormInfo as FormInfo } from '../../types/clearance.type'
import { formatDate } from './clearance-format'

/** "Trainee information" of the paper form: filled in by the system, read-only. */
export default function ClearanceFormInfo({ info }: { info: FormInfo }) {
  const fields = [
    ['Full name', info.trainee.name],
    ['Contact number', info.trainee.contactNumber],
    ['Address', info.trainee.address],
    ['Course/Program', `${info.programName} (${info.batchName})`],
    ['Date completed', info.dateCompleted ? formatDate(info.dateCompleted) : 'Not yet completed'],
    ['Trainer', info.trainerName],
  ]
  return (
    <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-slate-500">{label}</dt>
          <dd className="mt-0.5 break-words font-medium text-slate-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}
