'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'

type PlanSlug = 'essentiel' | 'pro' | 'avocat_virtuel'
type Billing = 'monthly' | 'yearly'

interface PlanCard {
  slug: PlanSlug | 'free'
  label: string
  monthly: number // cents
  yearly: number // cents
  yearlyMonthlyBarred: number // what "avant -30%" look like
  features: string[]
  popular?: boolean
  cta: string
}

const PLAN_CARDS: PlanCard[] = [
  {
    slug: 'free',
    label: 'Gratuit',
    monthly: 0,
    yearly: 0,
    yearlyMonthlyBarred: 0,
    features: [
      '3 consultations JurisIA / mois',
      'Analyse juridique de base',
      'Pas de génération de documents',
      'Idéal pour découvrir JurisPurama',
    ],
    cta: 'Ton plan actuel',
  },
  {
    slug: 'essentiel',
    label: 'Essentiel',
    monthly: 999,
    yearly: 8390,
    yearlyMonthlyBarred: 1420,
    features: [
      'Consultations JurisIA illimitées',
      '5 documents juridiques / mois',
      'Signature électronique (Art. 1366 CC)',
      '10 envois email / mois',
      'Scanner OCR et profil juridique',
    ],
    cta: 'Choisir Essentiel',
  },
  {
    slug: 'pro',
    label: 'Pro',
    monthly: 1999,
    yearly: 16790,
    yearlyMonthlyBarred: 2840,
    features: [
      'Tout Essentiel, en illimité',
      '3 recommandés AR / mois inclus',
      '50 envois email / mois',
      'Alertes deadlines J-7 / J-3 / J-1',
      'Support prioritaire',
    ],
    popular: true,
    cta: 'Choisir Pro',
  },
  {
    slug: 'avocat_virtuel',
    label: 'Avocat Virtuel',
    monthly: 3999,
    yearly: 33590,
    yearlyMonthlyBarred: 5680,
    features: [
      'Tout Pro, sans aucune limite',
      'Recommandés AR illimités',
      'Envois email illimités',
      'Suivi multi-dossiers avancé',
      'Accès prioritaire aux nouveautés',
    ],
    cta: 'Choisir Avocat Virtuel',
  },
]

const FAQ = [
  {
    q: 'Puis-je annuler à tout moment ?',
    a: 'Oui. Tu peux annuler depuis le portail Stripe en 2 clics. Aucune pénalité, aucune question.',
  },
  {
    q: 'Comment fonctionne l\'essai de 14 jours ?',
    a: '14 jours gratuits pour tester toutes les fonctions du plan. Tu n\'es débité qu\'à la fin de l\'essai, et tu peux annuler avant sans payer un centime.',
  },
  {
    q: 'Puis-je changer de plan en cours de route ?',
    a: 'Bien sûr. Tu passes à un plan supérieur ou inférieur quand tu veux depuis le portail Stripe. L\'ajustement est au prorata.',
  },
  {
    q: 'Les paiements sont-ils sécurisés ?',
    a: 'Oui. JurisPurama ne stocke aucune donnée bancaire. Tout passe par Stripe (PCI-DSS niveau 1).',
  },
  {
    q: 'Puis-je obtenir un remboursement ?',
    a: 'Oui, sous 14 jours après ton premier paiement hors essai, si tu n\'as généré aucun document. Contacte contact@purama.dev.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Léa M.',
    city: 'Lyon',
    text: 'Grâce à JurisPurama j\'ai contesté mon amende de 135€ en 3 clics. Le document était prêt en 2 minutes, reçu par l\'ANTAI 4 jours plus tard, annulée.',
    saved: 135,
  },
  {
    name: 'Karim B.',
    city: 'Paris',
    text: 'Mon propriétaire refusait de rendre ma caution. La mise en demeure générée par JurisIA a suffi — 1 200€ récupérés sans passer au tribunal.',
    saved: 1200,
  },
  {
    name: 'Sophie D.',
    city: 'Bordeaux',
    text: 'En tant qu\'auto-entrepreneuse, j\'utilise JurisPurama pour mes contestations URSSAF et mes factures impayées. Un Avocat Virtuel à 40€/mois.',
    saved: 2800,
  },
]

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
        body: JSON.stringify({ plan, billing }),
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

  const currentCard = useMemo(
    () => PLAN_CARDS.find((p) => p.slug === currentPlan),
    [currentPlan]
  )

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

      {/* Billing toggle */}
      <div className="mb-8 flex items-center justify-center">
        <div className="inline-flex items-center rounded-full border border-[var(--border)] bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBilling('monthly')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              billing === 'monthly'
                ? 'bg-[var(--justice)] text-white shadow'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Mensuel
          </button>
          <button
            type="button"
            onClick={() => setBilling('yearly')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              billing === 'yearly'
                ? 'bg-[var(--justice)] text-white shadow'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Annuel{' '}
            <span className="ml-1 rounded-full bg-[var(--gold)]/20 px-2 py-0.5 text-xs font-semibold text-[var(--gold-dark)]">
              -30%
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {PLAN_CARDS.map((plan) => {
          const isCurrent = currentPlan === plan.slug
          const price =
            billing === 'monthly'
              ? plan.monthly
              : Math.round(plan.yearly / 12)
          const yearlyBarred = plan.yearlyMonthlyBarred
          return (
            <Card
              key={plan.slug}
              padding="lg"
              className={
                plan.popular
                  ? 'relative border-2 border-[var(--gold)] bg-gradient-to-b from-white to-[var(--gold)]/5'
                  : 'relative'
              }
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="gold">⭐ POPULAIRE</Badge>
                </div>
              )}
              <div className="flex items-start justify-between">
                <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
                  {plan.label}
                </h2>
                {isCurrent && <Badge variant="green">Actif</Badge>}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {plan.slug === 'free' ? (
                  <span className="font-serif text-3xl font-bold text-[var(--justice)]">
                    Gratuit
                  </span>
                ) : (
                  <>
                    <span className="font-serif text-3xl font-bold text-[var(--justice)]">
                      {formatPrice(price)}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">/ mois</span>
                  </>
                )}
              </div>
              {billing === 'yearly' && plan.slug !== 'free' && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  <span className="line-through">
                    {formatPrice(yearlyBarred)}
                  </span>{' '}
                  · facturé {formatPrice(plan.yearly)} / an
                </p>
              )}
              <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span className="mt-0.5 text-[var(--gold)]">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <Button variant="secondary" size="md" fullWidth disabled>
                    Plan actuel
                  </Button>
                ) : plan.slug === 'free' ? (
                  <Button variant="ghost" size="md" fullWidth disabled>
                    Offre de départ
                  </Button>
                ) : (
                  <Button
                    variant={plan.popular ? 'primary' : 'secondary'}
                    size="md"
                    fullWidth
                    loading={loadingPlan === plan.slug}
                    onClick={() => handleCheckout(plan.slug as PlanSlug)}
                  >
                    Essayer 14 jours gratuit
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Comparaison features */}
      <Card padding="lg" className="mt-10">
        <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
          Ce qu&apos;inclut chaque plan
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-2">Fonctionnalité</th>
                <th className="py-2 text-center">Gratuit</th>
                <th className="py-2 text-center">Essentiel</th>
                <th className="py-2 text-center">Pro</th>
                <th className="py-2 text-center">Avocat Virtuel</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Consultations JurisIA', '3 / mois', 'Illimité', 'Illimité', 'Illimité'],
                ['Documents juridiques', '—', '5 / mois', 'Illimité', 'Illimité'],
                ['Signature électronique', '—', '✓', '✓', '✓'],
                ['Envois email', '—', '10 / mois', '50 / mois', 'Illimité'],
                ['Recommandés AR inclus', '—', '—', '3 / mois', 'Illimité'],
                ['Alertes deadlines', '—', '—', '✓', '✓'],
                ['Scanner OCR', '—', '✓', '✓', '✓'],
                ['Support', 'Email', 'Email', 'Prioritaire', 'Prioritaire'],
              ].map(([feature, ...cells]) => (
                <tr
                  key={feature as string}
                  className="border-b border-[var(--border)]/50"
                >
                  <td className="py-3 font-medium text-[var(--text-primary)]">
                    {feature}
                  </td>
                  {cells.map((c, i) => (
                    <td
                      key={`${feature}-${i}`}
                      className="py-3 text-center text-[var(--text-secondary)]"
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Testimonials */}
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <Card key={t.name} padding="lg">
            <p className="text-sm italic text-[var(--text-secondary)]">
              « {t.text} »
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--justice)]">
                  {t.name}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{t.city}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
                  Gain
                </p>
                <p className="font-serif text-lg font-bold text-[var(--justice)]">
                  {formatPrice(t.saved * 100)}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <Card padding="lg" className="mt-10">
        <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
          Questions fréquentes
        </h2>
        <div className="space-y-4">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-[var(--border)] bg-white p-4"
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--justice)] group-open:mb-2">
                {item.q}
              </summary>
              <p className="text-sm text-[var(--text-secondary)]">{item.a}</p>
            </details>
          ))}
        </div>
      </Card>

      <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
        Paiements 100% sécurisés par Stripe (PCI-DSS niveau 1). Aucune donnée
        bancaire stockée par JurisPurama.{' '}
        <Link href="/cgv" className="underline hover:text-[var(--justice)]">
          Conditions générales de vente
        </Link>
        .
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
