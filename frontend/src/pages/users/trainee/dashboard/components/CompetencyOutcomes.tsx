import type { DashboardCompetencyGroup } from '../../../../../types/trainee-dashboard.type'
import { enumLabel } from '../../../../../components/trainee-information/format'
import { OutcomeStatusChip } from './DashboardChips'
import { DashboardSection, EmptyState } from './DashboardSection'

export default function CompetencyOutcomes({ groups }: { groups: DashboardCompetencyGroup[] }) {
  const outcomes = groups.flatMap((group) => group.competencies.flatMap((c) => c.outcomes))
  const assessedCount = outcomes.filter((o) => o.status !== 'NOT_YET_ASSESSED').length
  const passedCount = outcomes.filter((o) => o.status === 'PASSED').length

  return (
    <DashboardSection
      eyebrow="Competencies"
      title="Competency Outcomes"
      aside={
        outcomes.length > 0 && (
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-900">{passedCount}</span> of {outcomes.length} passed
          </p>
        )
      }
    >
      {outcomes.length === 0 || assessedCount === 0 ? (
        <div className={outcomes.length > 0 ? 'mb-6' : ''}>
          <EmptyState
            icon="fa-solid fa-chart-line"
            title="No outcomes assessed yet"
            message={
              outcomes.length > 0
                ? 'Your trainer has not assessed any learning outcomes yet. The outcomes for your program are listed below.'
                : 'Learning outcomes for your program will appear here once you are enrolled and assessments begin.'
            }
          />
        </div>
      ) : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              {enumLabel(group.category)} competencies
            </h3>
            <div className="mt-3 space-y-3">
              {group.competencies.map((competency) => (
                <div key={competency.competencyId} className="border border-slate-200">
                  <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900">
                    <span className="mr-2 font-mono text-xs text-slate-400">{competency.competencyCode}</span>
                    {competency.competencyTitle}
                  </p>
                  {competency.outcomes.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-slate-400">No learning outcomes defined.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {competency.outcomes.map((outcome) => (
                        <li
                          key={outcome.learningOutcomeId}
                          className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                        >
                          <p className="min-w-0 flex-1 text-sm text-slate-700">
                            <span className="mr-2 text-xs font-semibold text-slate-400">
                              LO{outcome.outcomeNumber}
                            </span>
                            {outcome.outcomeDescription}
                          </p>
                          <OutcomeStatusChip status={outcome.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardSection>
  )
}
