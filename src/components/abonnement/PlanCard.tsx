'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatPrice } from '@/lib/utils'
import type { PlanSlug, Billing } from '@/types/plans'

interface PlanCardProps {
  plan: {
    slug: string
    label: string
    popular?: boolean
    monthly: number
    yearly: number
    yearlyMonthlyBarred: number
    features: string[]
  }
  billing: Billing
  currentPlan: string
  loadingPlan: PlanSlug | null
  onCheckout: (slug: PlanSlug) => void
}

export default function PlanCard({
  plan,
  billing,
  currentPlan,
  loadingPlan,
  onCheckout,
}: PlanCardProps) {
  const isCurrent = currentPlan === plan.slug
  const price = billing === 'monthly' ? plan.monthly : Math.round(plan.yearly / 12)
  const yearlyBarred = plan.yearlyMonthlyBarred

  return (
    <Card
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
          <span className="line-through">{formatPrice(yearlyBarred)}</span> ·
          facturé {formatPrice(plan.yearly)} / an
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
            onClick={() => onCheckout(plan.slug as PlanSlug)}
          >
            Démarrer & recevoir ma prime
          </Button>
        )}
      </div>
      {plan.slug !== 'free' && !isCurrent && (
        <p className="mt-3 text-[10px] leading-tight text-[var(--text-muted)]">
          En démarrant maintenant, tu bénéficies d&apos;un accès immédiat à ton
          abonnement (art. L221-28 Code conso).
        </p>
      )}
    </Card>
  )
}
