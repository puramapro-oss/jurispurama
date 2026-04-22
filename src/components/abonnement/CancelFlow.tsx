'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'

interface Props {
  onClose: () => void
  subscriptionInfo: {
    plan: string
    daysActive: number
    amount: number // cents
  }
}

interface Losses {
  walletBalance: number
  streakDays: number
  multiplier: number
  referralsCount: number
}

/**
 * Résiliation 3-étapes (V7.1 §21)
 * Step 1 → afficher les pertes (wallet, streak, multiplicateur, filleuls)
 * Step 2 → proposer pause 1 mois alternative
 * Step 3 → feedback (raison) + confirmation → Stripe cancel_at_period_end=true
 */
export default function CancelFlow({ onClose, subscriptionInfo }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [losses, setLosses] = useState<Losses | null>(null)
  const [reason, setReason] = useState<string>('')
  const [reasonDetail, setReasonDetail] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Charger pertes réelles
    fetch('/api/wallet', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setLosses({
          walletBalance: data.balance ?? 0,
          streakDays: data.streak ?? 0,
          multiplier: data.multiplier ?? 1,
          referralsCount: data.referrals_count ?? 0,
        })
      })
      .catch(() => {
        setLosses({ walletBalance: 0, streakDays: 0, multiplier: 1, referralsCount: 0 })
      })
  }, [])

  async function confirmCancel() {
    if (!reason) {
      toast.error('Merci d\'indiquer une raison avant de résilier.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          reason,
          reason_detail: reasonDetail.slice(0, 500),
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Impossible de résilier. Contacte le support.')
        return
      }
      toast.success(
        "Ton abonnement est résilié. Tu gardes l'accès jusqu'à la fin de ta période en cours."
      )
      onClose()
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      toast.error('Erreur réseau. Réessaie.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="flex">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`flex-1 h-1 ${
                n <= step ? 'bg-[var(--justice)]' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        <div className="p-6">
          {/* STEP 1 — Pertes */}
          {step === 1 && (
            <>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)] mb-2">
                Avant de partir…
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Voici ce que tu vas perdre si tu résilies :
              </p>
              <ul className="space-y-3 mb-6">
                {losses?.walletBalance && losses.walletBalance > 0 ? (
                  <li className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                    <span className="text-xl">💰</span>
                    <div>
                      <p className="font-semibold text-red-900 text-sm">
                        {(losses.walletBalance / 100).toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })}{' '}
                        en attente sur ton wallet
                      </p>
                      <p className="text-xs text-red-700">
                        Accessible au retrait après 30 jours. Annulation avant J+30 = prime
                        déduite.
                      </p>
                    </div>
                  </li>
                ) : null}
                {losses?.streakDays && losses.streakDays > 0 ? (
                  <li className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <span className="text-xl">🔥</span>
                    <div>
                      <p className="font-semibold text-orange-900 text-sm">
                        {losses.streakDays} jours de streak
                      </p>
                      <p className="text-xs text-orange-700">
                        Tu perds ton multiplicateur ×{losses.multiplier.toFixed(1)}.
                      </p>
                    </div>
                  </li>
                ) : null}
                {losses?.referralsCount && losses.referralsCount > 0 ? (
                  <li className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                    <span className="text-xl">👥</span>
                    <div>
                      <p className="font-semibold text-purple-900 text-sm">
                        {losses.referralsCount} filleul{losses.referralsCount > 1 ? 's' : ''} actif
                        {losses.referralsCount > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-purple-700">
                        Commissions récurrentes 10% à vie perdues.
                      </p>
                    </div>
                  </li>
                ) : null}
                <li className="flex items-start gap-3 p-3 bg-[var(--justice)]/5 rounded-lg">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <p className="font-semibold text-[var(--justice)] text-sm">
                      Accès illimité à JurisIA
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Tu reviens au plan gratuit (3 consultations/mois).
                    </p>
                  </div>
                </li>
              </ul>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} fullWidth>
                  Annuler, je reste
                </Button>
                <Button variant="secondary" onClick={() => setStep(2)} fullWidth>
                  Continuer →
                </Button>
              </div>
            </>
          )}

          {/* STEP 2 — Pause */}
          {step === 2 && (
            <>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)] mb-2">
                Et si tu mettais en pause ?
              </h2>
              <div className="rounded-xl bg-gradient-to-br from-[var(--gold)]/10 to-[var(--justice)]/5 p-5 mb-4">
                <p className="text-sm text-[var(--text-primary)] mb-2">
                  <strong>Pause 1 mois gratuite.</strong> Tu gardes :
                </p>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                  <li>✓ Ton wallet + primes en attente</li>
                  <li>✓ Ta streak et ton multiplicateur</li>
                  <li>✓ Tes filleuls et commissions récurrentes</li>
                  <li>✓ L&apos;historique de tes dossiers</li>
                </ul>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-5">
                Pendant la pause : pas de prélèvement. Ton accès premium revient automatiquement
                après 30 jours.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={async () => {
                    const res = await fetch('/api/stripe/portal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'pause' }),
                    })
                    const data = (await res.json()) as { url?: string; error?: string }
                    if (data.url) window.location.href = data.url
                    else toast.error(data.error ?? 'Impossible de mettre en pause.')
                  }}
                  fullWidth
                >
                  Mettre en pause
                </Button>
                <Button variant="ghost" onClick={() => setStep(3)} fullWidth>
                  Résilier quand même
                </Button>
              </div>
            </>
          )}

          {/* STEP 3 — Feedback */}
          {step === 3 && (
            <>
              <h2 className="font-serif text-2xl font-semibold text-[var(--justice)] mb-2">
                Dis-nous pourquoi
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Ton retour nous aide à améliorer JurisPurama.
              </p>
              <div className="space-y-2 mb-4">
                {[
                  { value: 'too_expensive', label: 'Trop cher' },
                  { value: 'not_enough_earnings', label: 'Pas assez de gains' },
                  { value: 'other_app', label: 'J\'utilise une autre app' },
                  { value: 'no_need', label: 'Je n\'ai plus besoin' },
                  { value: 'other', label: 'Autre raison' },
                ].map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      reason === r.value
                        ? 'border-[var(--justice)] bg-[var(--justice)]/5'
                        : 'border-[var(--border)] hover:bg-[var(--surface-alt)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="accent-[var(--justice)]"
                    />
                    <span className="text-sm">{r.label}</span>
                  </label>
                ))}
              </div>
              {reason === 'other' && (
                <textarea
                  value={reasonDetail}
                  onChange={(e) => setReasonDetail(e.target.value)}
                  placeholder="Précise (optionnel)…"
                  maxLength={500}
                  className="w-full rounded-lg border border-[var(--border)] p-3 text-sm mb-4 resize-none"
                  rows={3}
                />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setStep(2)} fullWidth>
                  ← Retour
                </Button>
                <Button
                  variant="secondary"
                  onClick={confirmCancel}
                  loading={submitting}
                  disabled={!reason}
                  fullWidth
                  className="!bg-red-600 !text-white hover:!bg-red-700"
                >
                  Confirmer la résiliation
                </Button>
              </div>
              <p className="mt-3 text-[10px] text-[var(--text-muted)] text-center">
                Effective fin de période. Wallet + données conservés selon CGV.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
