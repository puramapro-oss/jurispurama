import Card from '@/components/ui/Card'

interface Tier {
  tier: string
  label: string
  emoji: string
  minConversions: number
  bonusRecurringPct: number
}

interface ReferralTierProgressProps {
  tier: Tier | undefined
  next: Tier | null | undefined
  progress: number
}

export default function ReferralTierProgress({
  tier,
  next,
  progress,
}: ReferralTierProgressProps) {
  return (
    <Card padding="lg" className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Palier actuel
          </p>
          <p className="mt-1 font-serif text-2xl font-semibold text-[var(--justice)]">
            {tier ? `${tier.emoji} ${tier.label}` : '🌱 Débutant'}
          </p>
          {tier && tier.bonusRecurringPct > 0 && (
            <p className="text-xs text-[var(--gold-dark)]">
              Bonus +{tier.bonusRecurringPct}% récurrent
            </p>
          )}
        </div>
        {next && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Prochain palier
            </p>
            <p className="font-serif text-lg text-[var(--justice)]">
              {next.emoji} {next.label}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {next.minConversions} parrainages
            </p>
          </div>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full bg-gradient-to-r from-[var(--justice)] to-[var(--gold)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Paliers : 🌱 Débutant · 🥉 Bronze (5) · 🥈 Argent (10) · 🥇 Or (25) ·
        💎 Platine (50) · 💠 Diamant (75) · 👑 Légende (100)
      </p>
    </Card>
  )
}
