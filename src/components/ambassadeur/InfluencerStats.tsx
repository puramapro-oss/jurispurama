import Card from '@/components/ui/Card'

interface InfluencerStatsProps {
  totalClicks: number
  totalSignups: number
  totalConversions: number
  totalCommissions: number
}

export default function InfluencerStats({
  totalClicks,
  totalSignups,
  totalConversions,
  totalCommissions,
}: InfluencerStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Clics
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {totalClicks}
        </p>
      </Card>
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Inscriptions
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {totalSignups}
        </p>
      </Card>
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Conversions
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {totalConversions}
        </p>
      </Card>
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Commissions
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--gold-dark)]">
          {Number(totalCommissions ?? 0).toFixed(2)} €
        </p>
      </Card>
    </div>
  )
}
