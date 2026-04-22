'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'
import CancelFlow from '@/components/abonnement/CancelFlow'

interface SubscriptionInfo {
  plan: 'free' | 'essentiel' | 'pro' | 'avocat_virtuel'
  status: string
  current_period_end: string | null
  subscription_started_at: string | null
  cancel_at_period_end: boolean
  amount_cents: number
  billing_interval: 'month' | 'year' | null
}

export default function SettingsAbonnementPage() {
  const { profile } = useAuth()
  const [info, setInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [pauseLoading, setPauseLoading] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  useEffect(() => {
    fetch('/api/stripe/portal?action=status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setInfo(data))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [])

  async function handlePause() {
    setPauseLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pause' }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        toast.error(data.error)
      }
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setPauseLoading(false)
    }
  }

  const hasPaid = info && info.plan !== 'free'
  const subStart = info?.subscription_started_at ? new Date(info.subscription_started_at) : null
  const daysActive = subStart
    ? Math.floor((Date.now() - subStart.getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const withdrawUnlockDate = subStart
    ? new Date(subStart.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null

  return (
    <div className="container-narrow py-10">
      <header className="mb-8">
        <nav className="text-xs text-[var(--text-muted)] mb-2">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          {' › '}
          <span>Paramètres</span>
          {' › '}
          <span>Abonnement</span>
        </nav>
        <h1 className="font-serif text-3xl font-semibold text-[var(--justice)]">
          Gérer mon abonnement
        </h1>
      </header>

      {loading && (
        <Card className="p-6">
          <p className="text-sm text-[var(--text-muted)]">Chargement des informations…</p>
        </Card>
      )}

      {!loading && !hasPaid && (
        <Card className="p-6">
          <p className="text-sm mb-4">
            Tu n&apos;as pas encore d&apos;abonnement actif.
          </p>
          <Link href="/abonnement">
            <Button variant="primary">Choisir un plan</Button>
          </Link>
        </Card>
      )}

      {!loading && hasPaid && info && (
        <>
          {/* Plan actuel */}
          <Card className="p-6 mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
                  Plan actuel
                </p>
                <h2 className="font-serif text-2xl font-semibold text-[var(--justice)] mt-1 capitalize">
                  {info.plan.replace('_', ' ')}
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {formatPrice(info.amount_cents)} /{' '}
                  {info.billing_interval === 'year' ? 'an' : 'mois'}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={info.cancel_at_period_end ? 'red' : 'green'}>
                  {info.cancel_at_period_end ? 'Résiliation programmée' : 'Actif'}
                </Badge>
                {info.current_period_end && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {info.cancel_at_period_end ? 'Accès jusqu\'au' : 'Prochain prélèvement'} :<br />
                    {new Date(info.current_period_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Gate retrait wallet 30j */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                Jours d&apos;abonnement actif : <strong>{daysActive}</strong>.
                {daysActive < 30 && withdrawUnlockDate ? (
                  <>
                    {' '}
                    Retrait wallet débloqué le{' '}
                    <strong>
                      {withdrawUnlockDate.toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                      })}
                    </strong>
                    .
                  </>
                ) : (
                  <> Retrait wallet disponible.</>
                )}
              </p>
            </div>
          </Card>

          {/* Actions */}
          <Card className="p-6 mb-6">
            <h3 className="font-serif text-lg font-semibold text-[var(--justice)] mb-4">
              Actions
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={handlePause}
                loading={pauseLoading}
                fullWidth
              >
                Mettre en pause 1 mois
              </Button>
              <Link href="/abonnement">
                <Button variant="ghost" fullWidth>
                  Changer de plan
                </Button>
              </Link>
              {!info.cancel_at_period_end && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => setCancelOpen(true)}
                  className="sm:col-span-2 text-red-600 hover:bg-red-50"
                >
                  Résilier l&apos;abonnement
                </Button>
              )}
            </div>
          </Card>

          {/* Infos légales */}
          <Card className="p-6 bg-[var(--justice)]/5 border-[var(--justice)]/10">
            <h3 className="font-serif text-sm font-semibold text-[var(--justice)] mb-2">
              Informations importantes
            </h3>
            <ul className="text-xs text-[var(--text-secondary)] space-y-1.5">
              <li>
                ✓ Accès immédiat activé dès ta souscription (art. L221-28 3° Code conso —
                renonciation au droit de rétractation de 14 jours).
              </li>
              <li>
                ✓ Résiliation effective en fin de période en cours. Accès et données conservés
                jusqu&apos;à cette date.
              </li>
              <li>
                ✓ Données conservées 3 ans après résiliation (obligation comptable). Wallet +
                gains conservés 12 mois.
              </li>
              <li>
                ✓ Primes de bienvenue (J1/J30/J60) versées sur wallet Purama. Disponibles au
                retrait après 30 jours d&apos;abonnement actif consécutifs. Annulation avant
                30j = prime déduite du remboursement éventuel.
              </li>
            </ul>
          </Card>
        </>
      )}

      {cancelOpen && info && (
        <CancelFlow
          onClose={() => setCancelOpen(false)}
          subscriptionInfo={{
            plan: info.plan,
            daysActive,
            amount: info.amount_cents,
          }}
        />
      )}
    </div>
  )
}
