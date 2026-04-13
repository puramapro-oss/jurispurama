'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface PointTx {
  id: string
  amount: number
  type: 'earn' | 'spend'
  source: string
  description: string | null
  created_at: string
}

interface DailyGift {
  type: string
  value: string
  streak: number
}

interface PointsData {
  points: number
  transactions: PointTx[]
  dailyGiftClaimed: boolean
  lastGift: { gift_type: string; gift_value: string; streak_count: number } | null
}

const GIFT_LABELS: Record<string, string> = {
  points: 'Points bonus',
  coupon: 'Coupon de réduction',
  ticket: 'Ticket tirage',
  credits: 'Crédits IA',
  bonus_points: 'Super bonus points',
  mega_coupon: 'Méga coupon -50 %',
}

const EARN_WAYS = [
  { source: 'Inscription', points: 100 },
  { source: 'Parrainage', points: 200 },
  { source: 'Cadeau quotidien', points: '5–100' },
  { source: 'Partage (max 3/j)', points: 300 },
  { source: 'Avis App Store', points: 500 },
  { source: 'Feedback', points: 200 },
  { source: 'Connexion quotidienne', points: 10 },
]

export default function PointsPage() {
  const [data, setData] = useState<PointsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [claimedGift, setClaimedGift] = useState<DailyGift | null>(null)

  const fetchPoints = useCallback(async () => {
    try {
      const res = await fetch('/api/points')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error('Impossible de charger tes points.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPoints()
  }, [fetchPoints])

  const claimDailyGift = async () => {
    setClaiming(true)
    try {
      const res = await fetch('/api/points', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur.')
        return
      }
      setClaimedGift(json.gift)
      if (json.pointsEarned > 0) {
        toast.success(`+${json.pointsEarned} points !`)
      } else {
        toast.success(`Cadeau : ${GIFT_LABELS[json.gift.type] ?? json.gift.type}`)
      }
      fetchPoints()
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-10">
        <div className="mx-auto max-w-3xl space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    )
  }

  const points = data?.points ?? 0
  const alreadyClaimed = data?.dailyGiftClaimed ?? false

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
            Purama Points
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Gagne des points, échange-les contre des réductions et des avantages.
          </p>
        </div>

        {/* Solde */}
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/10 to-transparent" />
          <div className="relative p-6">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Ton solde
            </p>
            <p className="mt-2 font-serif text-4xl font-bold text-[var(--gold-dark)]">
              {points.toLocaleString('fr-FR')} pts
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              1 pt = 0,01 € &middot; 1 000 pts = -10 % &middot; 10 000 pts = 1
              mois gratuit
            </p>
          </div>
        </Card>

        {/* Daily Gift */}
        <Card>
          <div className="p-6">
            <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
              Cadeau quotidien
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Ouvre ton coffre chaque jour pour gagner des récompenses.
              {data?.lastGift?.streak_count
                ? ` Streak : ${data.lastGift.streak_count} jour${data.lastGift.streak_count > 1 ? 's' : ''} !`
                : ''}
            </p>
            {claimedGift ? (
              <div className="mt-4 rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-4 text-center">
                <p className="text-2xl">🎁</p>
                <p className="mt-2 font-serif text-lg font-semibold text-[var(--gold-dark)]">
                  {GIFT_LABELS[claimedGift.type] ?? claimedGift.type}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {claimedGift.value}
                  {claimedGift.streak >= 7 && ' (bonus streak !)'}
                </p>
              </div>
            ) : (
              <Button
                className="mt-4"
                onClick={claimDailyGift}
                disabled={alreadyClaimed || claiming}
              >
                {alreadyClaimed
                  ? 'Cadeau déjà ouvert aujourd\'hui'
                  : claiming
                    ? 'Ouverture…'
                    : 'Ouvrir mon cadeau'}
              </Button>
            )}
          </div>
        </Card>

        {/* How to earn */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--text-primary)]">
              Comment gagner des points
            </h2>
            <div className="space-y-2">
              {EARN_WAYS.map((w) => (
                <div
                  key={w.source}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/30 px-4 py-2.5"
                >
                  <span className="text-sm text-[var(--text-primary)]">
                    {w.source}
                  </span>
                  <span className="font-mono text-sm font-semibold text-[var(--gold-dark)]">
                    +{w.points} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* History */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--text-primary)]">
              Historique
            </h2>
            {(data?.transactions?.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Aucune transaction. Ouvre ton cadeau quotidien pour commencer !
              </p>
            ) : (
              <div className="space-y-2">
                {data!.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/30 px-4 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {tx.description ?? tx.source}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        tx.type === 'earn'
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}
                    >
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
