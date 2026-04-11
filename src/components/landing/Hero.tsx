'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLocale } from '@/hooks/useLocale'

interface HeroProps {
  communitySavingsLabel: string
}

export default function Hero({ communitySavingsLabel }: HeroProps) {
  const { t } = useLocale()

  return (
    <section className="relative overflow-hidden pt-28 md:pt-36">
      {/* Aurora layer */}
      <div className="pointer-events-none absolute inset-0">
        <div className="aurora" />
      </div>

      <div className="container-wide relative z-10">
        <div className="mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/85 backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]" />
            {t.hero.badge}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
            className="font-serif text-[44px] italic font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl md:text-[86px] lg:text-[96px]"
          >
            <span className="gradient-text">{t.hero.title}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
            className="mx-auto mt-7 max-w-2xl text-base text-white/75 md:text-xl md:leading-[1.55]"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/signup"
              className="pulse-gold group relative inline-flex h-14 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-8 text-base font-semibold text-[var(--justice-dark)] shadow-2xl shadow-[rgba(201,168,76,0.35)] transition hover:brightness-110"
            >
              <span className="relative z-10 flex items-center gap-2">
                {t.hero.ctaPrimary}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="transition group-hover:translate-x-0.5">
                  <path d="M5 12h14" />
                  <path d="M13 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-14 items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 text-base font-medium text-white/90 backdrop-blur-md transition hover:border-[var(--gold)]/60 hover:bg-white/10"
            >
              {t.hero.ctaSecondary}
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mt-5 text-xs text-white/55"
          >
            {t.hero.trust}
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
        >
          <StatCard value="12" label={t.hero.statsDomains} />
          <StatCard value="< 30s" label={t.hero.statsTime} highlight />
          <StatCard value={communitySavingsLabel} label={t.hero.statsSaved} />
        </motion.div>
      </div>
    </section>
  )
}

function StatCard({
  value,
  label,
  highlight,
}: {
  value: string
  label: string
  highlight?: boolean
}) {
  return (
    <div
      className={`glass-dark rounded-2xl p-5 text-center transition hover:-translate-y-0.5 ${
        highlight ? 'border-[var(--gold)]/40' : ''
      }`}
    >
      <div className="font-serif text-3xl font-semibold leading-none text-white md:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-wider text-white/60 md:text-xs">
        {label}
      </div>
    </div>
  )
}
