'use client'

import Card from '@/components/ui/Card'
import { FAQ } from '@/lib/plans-data'

export default function FAQSection() {
  return (
    <Card padding="lg" className="mt-10">
      <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
        Questions fréquentes
      </h2>
      <div className="space-y-4">
        {FAQ.map((item) => (
          <details
            key={item.q}
            className="group rounded-xl border border-[var(--border)] bg-white p-4"
          >
            <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--justice)] group-open:mb-2">
              {item.q}
            </summary>
            <p className="text-sm text-[var(--text-secondary)]">{item.a}</p>
          </details>
        ))}
      </div>
    </Card>
  )
}
