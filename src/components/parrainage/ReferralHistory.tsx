import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface Referral {
  id: string
  created_at: string
  status: string
  commission_paid: number
}

interface ReferralHistoryProps {
  referrals: Referral[] | null
}

export default function ReferralHistory({ referrals }: ReferralHistoryProps) {
  return (
    <Card padding="lg" className="mt-6">
      <h2 className="mb-4 font-serif text-xl font-semibold text-[var(--justice)]">
        Historique de tes filleuls
      </h2>
      {!referrals || referrals.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucun filleul pour le moment. Partage ton lien pour commencer à
          gagner.
        </p>
      ) : (
        <ul className="space-y-2">
          {referrals.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 p-3"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Filleul #{i + 1}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(r.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {r.status === 'converted' ? (
                  <Badge variant="green">Payant</Badge>
                ) : (
                  <Badge variant="gray">En attente</Badge>
                )}
                <span className="font-mono text-sm font-semibold text-[var(--justice)]">
                  {Number(r.commission_paid ?? 0).toFixed(2)} €
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
