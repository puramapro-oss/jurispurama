'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import { PLANS } from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import Reveal from '@/components/landing/Reveal'
import { PLAN_ORDER, FEATURE_ROWS, FAQ, type Cycle } from '@/lib/pricing-data'
import { CheckIcon, CrossIcon } from '@/components/pricing/icons'
import FinancementBanner from '@/components/pricing/FinancementBanner'

export default function PricingClient() {
  const { t } = useLocale()
  const [cycle, setCycle] = useState<Cycle>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  return (
    <>
      <FinancementBanner />

      <section className="relative pt-6">
        <div className="container-wide">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
              Tarifs
            </p>
            <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
              {t.pricing.title}
            </h1>
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

          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {PLAN_ORDER.map((id, i) => {
              const plan = PLANS[id]
              const popular = 'popular' in plan && plan.popular
              const monthly = plan.priceMonthly
              const yearlyMonthly = Math.round(plan.priceYearly / 12)
              const price = cycle === 'yearly' ? yearlyMonthly : monthly
              const strike = cycle === 'yearly' && monthly > 0 ? monthly : null

              return (
                <Reveal key={id} delay={i * 0.06}>
                  <div
                    className={`glass-dark relative flex h-full flex-col rounded-3xl p-6 transition ${
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
                    <h2 className="font-serif text-2xl font-semibold text-white">
                      {plan.label}
                    </h2>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span className="font-serif text-5xl font-semibold text-white">
                        {price === 0 ? '0 €' : formatPrice(price)}
                      </span>
                      {price > 0 && (
                        <span className="text-sm text-white/50">/ mois</span>
                      )}
                    </div>
                    {strike !== null && (
                      <div className="mt-1 text-xs text-white/45 line-through">
                        {formatPrice(strike)} / mois
                      </div>
                    )}
                    {cycle === 'yearly' && monthly > 0 && (
                      <div className="mt-1 text-xs text-[var(--gold-light)]">
                        Facturé {formatPrice(plan.priceYearly)} / an
                      </div>
                    )}
                    <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-white/80"
                        >
                          <CheckIcon />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/signup"
                      className={`mt-7 inline-flex h-12 items-center justify-center rounded-xl text-sm font-semibold transition ${
                        popular
                          ? 'bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-[var(--justice-dark)] shadow-lg shadow-[rgba(201,168,76,0.28)] hover:brightness-110'
                          : id === 'free'
                            ? 'border border-white/15 bg-white/5 text-white/90 hover:border-white/30'
                            : 'border border-white/20 bg-white/5 text-white hover:border-[var(--gold)]/60'
                      }`}
                    >
                      {id === 'free' ? t.pricing.ctaFree : t.pricing.cta}
                    </Link>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparative table */}
      <section className="relative py-24 md:py-32">
        <div className="container-wide">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-semibold italic leading-tight text-white md:text-4xl">
              Tableau comparatif complet
            </h2>
          </Reveal>

          <Reveal delay={0.1} className="mx-auto max-w-6xl">
            <div className="glass-dark overflow-x-auto rounded-3xl">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/50">
                    <th className="px-5 py-4 text-left font-semibold" scope="col">
                      Fonctionnalité
                    </th>
                    {PLAN_ORDER.map((id) => (
                      <th
                        key={id}
                        scope="col"
                        className={`px-5 py-4 text-center font-semibold ${
                          id === 'pro'
                            ? 'bg-gradient-to-b from-[var(--gold)]/10 to-transparent text-[var(--gold)]'
                            : 'text-white/80'
                        }`}
                      >
                        {PLANS[id].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_ROWS.map((row, rowIdx) => (
                    <tr
                      key={row.label}
                      className={`border-b border-white/5 ${
                        rowIdx % 2 === 1 ? 'bg-white/[0.015]' : ''
                      }`}
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-medium text-white/85"
                      >
                        {row.label}
                      </th>
                      {PLAN_ORDER.map((id) => {
                        const v = row.values[id]
                        return (
                          <td
                            key={id}
                            className={`px-5 py-4 text-center ${
                              id === 'pro'
                                ? 'bg-gradient-to-b from-[var(--gold)]/5 to-transparent'
                                : ''
                            }`}
                          >
                            {v === true ? (
                              <span className="inline-flex">
                                <CheckIcon />
                              </span>
                            ) : v === false ? (
                              <span className="inline-flex">
                                <CrossIcon />
                              </span>
                            ) : (
                              <span className="text-white/75">{v}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="relative pb-24 md:pb-32">
        <div className="container-wide">
          <Reveal className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="font-serif text-3xl font-semibold italic leading-tight text-white md:text-4xl">
              Questions fréquentes sur nos plans
            </h2>
          </Reveal>
          <div className="mx-auto max-w-3xl space-y-3">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i
              return (
                <Reveal key={i} delay={i * 0.05}>
                  <div
                    className={`glass-dark rounded-2xl ${
                      isOpen ? 'border-[var(--gold)]/40' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                    >
                      <span className="font-serif text-lg font-semibold text-white md:text-xl">
                        {item.q}
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        className={`flex-shrink-0 text-[var(--gold)] transition-transform ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                        aria-hidden="true"
                      >
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-white/5 px-6 pb-6 pt-4 text-sm leading-relaxed text-white/75">
                        {item.a}
                      </div>
                    )}
                  </div>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={0.2} className="mx-auto mt-16 max-w-xl text-center">
            <div className="glass-dark rounded-3xl p-8">
              <p className="text-white/80">
                Une question qui n&apos;est pas dans cette liste ?
              </p>
              <Link
                href="/contact"
                className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-md transition hover:border-[var(--gold)]/60"
              >
                Contacter l&apos;équipe
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
