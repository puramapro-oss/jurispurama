'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { PLANS, type PlanId } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import Reveal from './Reveal'

type Cycle = 'monthly' | 'yearly'

const FEATURED: PlanId[] = ['essentiel', 'pro', 'avocat_virtuel']

export default function PricingPreview() {
  const { t } = useLocale()
  const [cycle, setCycle] = useState<Cycle>('monthly')

  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Tarifs
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.pricing.title}
          </h2>
          <p className="mt-4 text-white/65 md:text-lg">{t.pricing.subtitle}</p>

          <div
            role="radiogroup"
            className="mx-auto mt-8 inline-flex rounded-full border border-white/15 bg-white/5 p-1 text-sm"
          >
            <button
              type="button"
              role="radio"
              aria-checked={cycle === 'monthly'}
              onClick={() => setCycle('monthly')}
              className={`rounded-full px-5 py-2 font-medium transition ${
                cycle === 'monthly'
                  ? 'bg-white text-[var(--justice-dark)] shadow'
                  : 'text-white/70'
              }`}
            >
              {t.pricing.monthly}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={cycle === 'yearly'}
              onClick={() => setCycle('yearly')}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 font-medium transition ${
                cycle === 'yearly'
                  ? 'bg-white text-[var(--justice-dark)] shadow'
                  : 'text-white/70'
              }`}
            >
              {t.pricing.yearly}
              <span className="rounded-full bg-[var(--gold)]/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold-light)]">
                {t.pricing.save}
              </span>
            </button>
          </div>
        </Reveal>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {FEATURED.map((id, i) => {
            const plan = PLANS[id]
            const popular = 'popular' in plan && plan.popular
            const monthly = plan.priceMonthly
            const yearlyMonthly = Math.round(plan.priceYearly / 12)
            const displayPrice =
              cycle === 'yearly' ? yearlyMonthly : monthly
            const strikePrice = cycle === 'yearly' ? monthly : null

            return (
              <Reveal key={id} delay={i * 0.08}>
                <div
                  className={`glass-dark relative flex h-full flex-col rounded-3xl p-7 transition ${
                    popular
                      ? 'border-[var(--gold)]/50 shadow-[0_20px_60px_rgba(201,168,76,0.12)]'
                      : ''
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--justice-dark)] shadow-lg">
                      {t.pricing.popular}
                    </div>
                  )}
                  <h3 className="font-serif text-2xl font-semibold text-white">
                    {plan.label}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-serif text-5xl font-semibold text-white">
                      {formatPrice(displayPrice)}
                    </span>
                    <span className="text-sm text-white/50">/ mois</span>
                  </div>
                  {strikePrice !== null && (
                    <div className="mt-1 text-xs text-white/45 line-through">
                      {formatPrice(strikePrice)} / mois
                    </div>
                  )}
                  <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-white/80"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mt-0.5 flex-shrink-0 text-[var(--gold)]"
                          aria-hidden="true"
                        >
                          <path d="M5 12l5 5L20 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-7 inline-flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition ${
                      popular
                        ? 'bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-[var(--justice-dark)] shadow-lg shadow-[rgba(201,168,76,0.28)] hover:brightness-110'
                        : 'border border-white/20 bg-white/5 text-white hover:border-[var(--gold)]/60'
                    }`}
                  >
                    {t.pricing.cta}
                  </Link>
                </div>
              </Reveal>
            )
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 transition hover:text-[var(--gold)]"
          >
            Voir le tableau comparatif complet
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
