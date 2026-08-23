'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import type { PlanSlug, Billing } from '@/types/plans'
import { PLAN_CARDS } from '@/lib/plans-data'
import BillingToggle from '@/components/abonnement/BillingToggle'
import PlanCard from '@/components/abonnement/PlanCard'
import FeatureComparisonTable from '@/components/abonnement/FeatureComparisonTable'
import GuaranteesList from '@/components/abonnement/GuaranteesList'
import FAQSection from '@/components/abonnement/FAQSection'

function AbonnementContent() {
  const { profile } = useAuth()
  const searchParams = useSearchParams()
  const [billing, setBilling] = useState<Billing>('yearly')
  const [loadingPlan, setLoadingPlan] = useState<PlanSlug | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const currentPlan = profile?.subscription_plan ?? 'free'
  const hasPaidPlan = currentPlan !== 'free'

  useEffect(() => {
    if (searchParams.get('upgrade') === 'success') {
      toast.success('Bienvenue dans ton nouveau plan. Profite de JurisPurama !')
    }
    if (searchParams.get('canceled') === '1') {
      toast('Paiement annulé. Ton plan actuel est inchangé.', { icon: 'ℹ️' })
    }
  }, [searchParams])

  async function handleCheckout(plan: PlanSlug) {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing, idempotencyKey: crypto.randomUUID() }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Impossible de créer la session de paiement.')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Erreur réseau. Réessaie dans un instant.')
    } finally {
      setLoadingPlan(null)
    }
  }

  async function handlePortal() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Portail indisponible pour le moment.')
        return
      }
      window.location.href = data.url
    } catch {
      toast.error('Erreur réseau. Réessaie dans un instant.')
    } finally {
      setPortalLoading(false)
    }
  }

  const currentCard = PLAN_CARDS.find((p) => p.slug === currentPlan)

  return (
    <div className="container-narrow py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Abonnement
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Choisis ton plan
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          14 jours d&apos;essai gratuit · sans carte bancaire · annulable en
          2 clics. Aujourd&apos;hui 2 740 utilisateurs font confiance à
          JurisPurama.
        </p>
      </header>

      {hasPaidPlan && currentCard && (
        <Card padding="lg" className="mb-8 border-2 border-[var(--gold)]/40">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
                Ton plan actuel
              </p>
              <p className="mt-1 font-serif text-2xl font-semibold text-[var(--justice)]">
                {currentCard.label}
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Gère ta facturation, change de formule ou annule depuis le
                portail sécurisé Stripe.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handlePortal}
              loading={portalLoading}
            >
              Gérer via Stripe
            </Button>
          </div>
        </Card>
      )}

      <BillingToggle billing={billing} onChange={setBilling} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_CARDS.map((plan) => (
          <PlanCard
            key={plan.slug}
            plan={plan}
            billing={billing}
            currentPlan={currentPlan}
            loadingPlan={loadingPlan}
            onCheckout={handleCheckout}
          />
        ))}
      </div>

      <FeatureComparisonTable />
      <GuaranteesList />
      <FAQSection />

      <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
        Paiements 100% sécurisés par Stripe (PCI-DSS niveau 1). Aucune donnée
        bancaire stockée par JurisPurama.{' '}
        <Link href="/cgv" className="underline hover:text-[var(--justice)]">
          Conditions générales de vente
        </Link>
        .
      </p>

      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        <Link
          href="/settings/ma-memoire"
          className="underline hover:text-[var(--justice)]"
        >
          Voir, exporter ou supprimer mes données (Ma mémoire)
        </Link>
      </p>
    </div>
  )
}

export default function AbonnementPage() {
  return (
    <Suspense
      fallback={
        <div className="container-narrow py-10">
          <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
        </div>
      }
    >
      <AbonnementContent />
    </Suspense>
  )
}
