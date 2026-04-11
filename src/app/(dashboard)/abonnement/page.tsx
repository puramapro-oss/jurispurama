'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { PLANS } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/lib/utils'

export default function AbonnementPage() {
  const { profile } = useAuth()
  const currentPlan = profile?.subscription_plan ?? 'free'

  return (
    <div className="container-narrow py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Abonnement
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Choisis ton plan
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Plan actuel :{' '}
          <span className="font-semibold capitalize">{currentPlan}</span>
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.values(PLANS).map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isPopular = 'popular' in plan && plan.popular === true
          return (
            <Card
              key={plan.id}
              padding="lg"
              className={
                isPopular
                  ? 'border-2 border-[var(--gold)] bg-gradient-to-b from-white to-[var(--gold)]/5'
                  : ''
              }
            >
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
                  {plan.label}
                </h2>
                {isPopular && <Badge variant="gold">⭐ Populaire</Badge>}
                {isCurrent && <Badge variant="green">Actif</Badge>}
              </div>
              <p className="mt-2 font-serif text-3xl font-bold text-[var(--justice)]">
                {plan.priceMonthly === 0 ? 'Gratuit' : formatPrice(plan.priceMonthly)}
                {plan.priceMonthly > 0 && (
                  <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">
                    / mois
                  </span>
                )}
              </p>
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
                ) : plan.id === 'free' ? (
                  <Button variant="ghost" size="md" fullWidth disabled>
                    Offre de départ
                  </Button>
                ) : (
                  <Button variant="primary" size="md" fullWidth disabled>
                    Bientôt disponible
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
        Les paiements Stripe seront activés très prochainement. Pour un accès
        prioritaire,{' '}
        <Link href="/contact" className="underline hover:text-[var(--justice)]">
          contacte-nous
        </Link>
        .
      </p>
    </div>
  )
}
