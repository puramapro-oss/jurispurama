'use client'

import Card from '@/components/ui/Card'

const FEATURES = [
  ['Consultations JurisIA', '3 / mois', 'Illimité', 'Illimité', 'Illimité'],
  ['Documents juridiques', '—', '5 / mois', 'Illimité', 'Illimité'],
  ['Signature électronique', '—', '✓', '✓', '✓'],
  ['Envois email', '—', '10 / mois', '50 / mois', 'Illimité'],
  ['Recommandés AR inclus', '—', '—', '3 / mois', 'Illimité'],
  ['Alertes deadlines', '—', '—', '✓', '✓'],
  ['Scanner OCR', '—', '✓', '✓', '✓'],
  ['Support', 'Email', 'Email', 'Prioritaire', 'Prioritaire'],
]

export default function FeatureComparisonTable() {
  return (
    <Card padding="lg" className="mt-10">
      <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
        Ce qu&apos;inclut chaque plan
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
              <th className="py-2">Fonctionnalité</th>
              <th className="py-2 text-center">Gratuit</th>
              <th className="py-2 text-center">Essentiel</th>
              <th className="py-2 text-center">Pro</th>
              <th className="py-2 text-center">Premium</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(([feature, ...cells]) => (
              <tr
                key={feature as string}
                className="border-b border-[var(--border)]/50"
              >
                <td className="py-3 font-medium text-[var(--text-primary)]">
                  {feature}
                </td>
                {cells.map((c, i) => (
                  <td
                    key={`${feature}-${i}`}
                    className="py-3 text-center text-[var(--text-secondary)]"
                  >
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
