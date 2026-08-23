'use client'

import Card from '@/components/ui/Card'
import { GUARANTEES } from '@/lib/plans-data'

export default function GuaranteesList() {
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {GUARANTEES.map((g) => (
        <Card key={g.title} padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Engagement
          </p>
          <h3 className="mt-2 font-serif text-lg font-semibold text-[var(--justice)]">
            {g.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {g.text}
          </p>
        </Card>
      ))}
    </div>
  )
}
