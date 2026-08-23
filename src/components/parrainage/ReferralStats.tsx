import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ReferralStatsProps {
  totalSignups: number
  totalConversions: number
  totalCommission: number
  pendingCommission: number
  loading: boolean
  withdrawLoading: boolean
  onWithdraw: () => void
}

export default function ReferralStats({
  totalSignups,
  totalConversions,
  totalCommission,
  pendingCommission,
  loading,
  withdrawLoading,
  onWithdraw,
}: ReferralStatsProps) {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Inscriptions
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {loading ? '…' : totalSignups}
        </p>
      </Card>
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Conversions payantes
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {loading ? '…' : totalConversions}
        </p>
      </Card>
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Commissions totales
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
          {totalCommission.toFixed(2)} €
        </p>
      </Card>
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Disponible pour retrait
        </p>
        <p className="mt-1 font-serif text-3xl font-bold text-[var(--gold-dark)]">
          {pendingCommission.toFixed(2)} €
        </p>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={onWithdraw}
          loading={withdrawLoading}
          disabled={pendingCommission < 5}
          className="mt-3"
        >
          Demander un virement
        </Button>
      </Card>
    </div>
  )
}
