'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface InfluencerRow {
  id: string
  user_id: string
  slug: string
  bio: string | null
  tier: string
  total_clicks: number
  total_signups: number
  total_conversions: number
  total_commissions: number
  approved: boolean
  created_at: string
  email: string
  full_name: string | null
}

interface Withdrawal {
  id: string
  user_id: string
  amount: number
  status: string
  stripe_payment_id: string | null
  created_at: string
}

export default function AdminInfluencersPage() {
  const [influencers, setInfluencers] = useState<InfluencerRow[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/influencers')
      if (!res.ok) {
        toast.error('Erreur de chargement')
        return
      }
      const data = (await res.json()) as {
        influencers: InfluencerRow[]
        withdrawals: Withdrawal[]
      }
      setInfluencers(data.influencers)
      setWithdrawals(data.withdrawals)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function markPaid(paymentId: string) {
    const res = await fetch('/api/admin/influencers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, status: 'paid' }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      toast.error(data.error ?? 'Mise à jour impossible')
      return
    }
    toast.success('Marqué comme payé')
    await load()
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <h2 className="mb-3 font-serif text-2xl font-semibold text-[var(--justice)]">
          Influenceurs ({influencers.length})
        </h2>
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
        ) : influencers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aucun influenceur.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-2 pr-2">Influenceur</th>
                  <th className="py-2 px-2">Slug</th>
                  <th className="py-2 px-2">Palier</th>
                  <th className="py-2 px-2">Clics</th>
                  <th className="py-2 px-2">Signups</th>
                  <th className="py-2 px-2">Conv.</th>
                  <th className="py-2 pl-2">Commissions</th>
                </tr>
              </thead>
              <tbody>
                {influencers.map((i) => (
                  <tr key={i.id} className="border-b border-[var(--border)]/50">
                    <td className="py-2 pr-2">
                      <p className="font-medium text-[var(--text-primary)]">
                        {i.full_name ?? i.email}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{i.email}</p>
                    </td>
                    <td className="py-2 px-2 font-mono text-xs text-[var(--text-muted)]">
                      {i.slug}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="gold">{i.tier}</Badge>
                    </td>
                    <td className="py-2 px-2">{i.total_clicks}</td>
                    <td className="py-2 px-2">{i.total_signups}</td>
                    <td className="py-2 px-2">{i.total_conversions}</td>
                    <td className="py-2 pl-2 font-mono font-semibold text-[var(--justice)]">
                      {Number(i.total_commissions ?? 0).toFixed(2)} €
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="lg">
        <h2 className="mb-3 font-serif text-2xl font-semibold text-[var(--justice)]">
          Demandes de virement
        </h2>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aucune demande en cours.</p>
        ) : (
          <ul className="space-y-2">
            {withdrawals.map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 p-3"
              >
                <div>
                  <p className="font-semibold text-[var(--justice)]">
                    {Number(w.amount ?? 0).toFixed(2)} €
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(w.created_at).toLocaleDateString('fr-FR')} ·{' '}
                    user {w.user_id.slice(0, 8)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      w.status === 'paid'
                        ? 'green'
                        : w.status === 'pending'
                          ? 'amber'
                          : 'gray'
                    }
                  >
                    {w.status}
                  </Badge>
                  {w.status === 'pending' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => markPaid(w.id)}
                    >
                      Marquer payé
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
