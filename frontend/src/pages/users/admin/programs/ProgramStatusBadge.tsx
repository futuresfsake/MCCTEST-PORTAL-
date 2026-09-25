type ProgramStatusBadgeProps = {
  isActive: boolean
}

function ProgramStatusBadge({
  isActive,
}: ProgramStatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
      <span
        className={[
          'h-1.5 w-1.5 rounded-full',
          isActive
            ? 'bg-green-600'
            : 'bg-slate-300',
        ].join(' ')}
      />

      <span
        className={
          isActive
            ? 'text-green-700'
            : 'text-slate-400'
        }
      >
        {isActive ? 'Active' : 'Archived'}
      </span>
    </span>
  )
}

export default ProgramStatusBadge