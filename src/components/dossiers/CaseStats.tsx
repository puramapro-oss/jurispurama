'use client'

import Card from '@/components/ui/Card'
import Progress from '@/components/ui/Progress'
import type { JurisCase } from '@/types'
import { formatDeadline, formatEuros } from '@/lib/case-helpers'

interface CaseStatsProps {
  caseRow: JurisCase
  nextDeadline?: { date: string; description: string } | null
}

export default function CaseStats({ caseRow, nextDeadline }: CaseStatsProps) {
  return (
    <div className="mb-6 grid gap-3 md:grid-cols-3">
      <Card padding="md">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Probabilité de succès
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {caseRow.success_probability != null
            ? `${caseRow.success_probability}%`
            : '—'}
        </p>
        {caseRow.success_probability != null && (
          <div className="mt-2">
            <Progress value={caseRow.success_probability} />
          </div>
        )}
      </Card>
      <Card padding="md">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Argent potentiellement sauvé
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-emerald-700">
          {formatEuros(caseRow.money_saved)}
        </p>
      </Card>
      <Card padding="md">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Prochaine échéance
        </p>
        <p className="mt-1 font-serif text-xl font-bold text-[var(--justice)]">
          {nextDeadline ? formatDeadline(nextDeadline.date) : '—'}
        </p>
        {nextDeadline && (
          <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
            {nextDeadline.description}
          </p>
        )}
      </Card>
    </div>
  )
}
