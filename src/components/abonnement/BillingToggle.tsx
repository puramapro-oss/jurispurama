'use client'

import type { Billing } from '@/types/plans'

interface BillingToggleProps {
  billing: Billing
  onChange: (billing: Billing) => void
}

export default function BillingToggle({ billing, onChange }: BillingToggleProps) {
  return (
    <div className="mb-8 flex items-center justify-center">
      <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => onChange('monthly')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            billing === 'monthly'
              ? 'bg-[var(--justice)] text-white shadow'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Mensuel
        </button>
        <button
          type="button"
          onClick={() => onChange('yearly')}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            billing === 'yearly'
              ? 'bg-[var(--justice)] text-white shadow'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          Annuel{' '}
          <span className="ml-1 rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--gold-dark)]">
            -30%
          </span>
        </button>
      </div>
    </div>
  )
}
