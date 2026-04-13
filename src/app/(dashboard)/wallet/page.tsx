'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { formatDate } from '@/lib/utils'

interface WalletTx {
  id: string
  amount: number
  type: 'credit' | 'debit' | 'withdrawal'
  source: string
  description: string | null
  created_at: string
}

interface Withdrawal {
  id: string
  amount: number
  iban: string
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  requested_at: string
  processed_at: string | null
}

interface WalletData {
  balance: number
  points: number
  transactions: WalletTx[]
  withdrawals: Withdrawal[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'green' | 'amber' | 'default' | 'red' }> = {
  pending: { label: 'En attente', variant: 'amber' },
  processing: { label: 'En cours', variant: 'default' },
  completed: { label: 'Effectué', variant: 'green' },
  rejected: { label: 'Refusé', variant: 'red' },
}

export default function WalletPage() {
  const { profile } = useAuth()
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [iban, setIban] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch('/api/wallet')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Impossible de charger ton wallet.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

  const handleWithdraw = async () => {
    const num = parseFloat(amount)
    if (!num || num < 5) {
      toast.error('Le montant minimum est de 5 €.')
      return
    }
    if (!iban || iban.replace(/\s/g, '').length < 15) {
      toast.error('IBAN invalide.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: num,
          iban: iban.replace(/\s/g, '').toUpperCase(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors du retrait.')
        return
      }
      toast.success('Demande de retrait envoyée !')
      setWithdrawOpen(false)
      setIban('')
      setAmount('')
      fetchWallet()
    } catch {
      toast.error('Erreur réseau. Réessaie.')
    } finally {
      setSubmitting(false)
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

  const balance = data?.balance ?? 0
  const points = data?.points ?? 0
  const canWithdraw = balance >= 5

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
            Mon wallet
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Tes gains de parrainage et tes Purama Points.
          </p>
        </div>

        {/* Solde + Points */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--justice)]/10 to-transparent" />
            <div className="relative p-6">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Solde disponible
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-[var(--justice)]">
                {balance.toFixed(2)}&nbsp;€
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Retrait dès 5 € par virement IBAN
              </p>
            </div>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/10 to-transparent" />
            <div className="relative p-6">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                Purama Points
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-[var(--gold-dark)]">
                {points.toLocaleString('fr-FR')}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                1 pt = 0,01 € &middot; Utilisables en boutique
              </p>
            </div>
          </Card>
        </div>

        {/* Retrait */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
                Retirer mes gains
              </h2>
              {!withdrawOpen && (
                <Button
                  size="sm"
                  onClick={() => setWithdrawOpen(true)}
                  disabled={!canWithdraw}
                >
                  {canWithdraw
                    ? 'Demander un retrait'
                    : `Minimum 5 € (${balance.toFixed(2)} €)`}
                </Button>
              )}
            </div>

            {withdrawOpen && (
              <div className="mt-4 space-y-4 rounded-xl border border-[var(--border)] bg-white/40 p-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                    Montant (€)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={balance}
                    step={0.01}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-white/60 px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--justice)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-white/60 px-4 py-2.5 font-mono text-sm text-[var(--text-primary)] focus:border-[var(--justice)] focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleWithdraw} disabled={submitting}>
                    {submitting ? 'Envoi en cours…' : 'Confirmer le retrait'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setWithdrawOpen(false)}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Retraits en cours */}
        {(data?.withdrawals?.length ?? 0) > 0 && (
          <Card>
            <div className="p-6">
              <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--text-primary)]">
                Historique des retraits
              </h2>
              <div className="space-y-3">
                {data!.withdrawals.map((w) => {
                  const s = STATUS_MAP[w.status] ?? STATUS_MAP.pending
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/30 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {Number(w.amount).toFixed(2)} €
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(w.requested_at)}
                        </p>
                      </div>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Transactions */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--text-primary)]">
              Dernières transactions
            </h2>
            {(data?.transactions?.length ?? 0) === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Aucune transaction pour le moment. Parraine des amis pour
                commencer à gagner !
              </p>
            ) : (
              <div className="space-y-2">
                {data!.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/30 px-4 py-3"
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
                        Number(tx.amount) >= 0
                          ? 'text-emerald-600'
                          : 'text-red-500'
                      }`}
                    >
                      {Number(tx.amount) >= 0 ? '+' : ''}
                      {Number(tx.amount).toFixed(2)} €
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
