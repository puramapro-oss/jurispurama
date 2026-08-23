import Card from '@/components/ui/Card'

interface TierInfo {
  label: string
  emoji: string
  benefits: string[]
}

interface TierBenefitsProps {
  tierInfo: TierInfo
}

export default function TierBenefits({ tierInfo }: TierBenefitsProps) {
  return (
    <Card padding="lg" className="mt-6">
      <div className="mb-3">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Avantages {tierInfo.label}
        </p>
        <p className="font-serif text-xl font-semibold text-[var(--justice)]">
          {tierInfo.emoji} Palier {tierInfo.label}
        </p>
      </div>
      <ul className="grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2">
        {tierInfo.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <span className="mt-0.5 text-[var(--gold)]">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
