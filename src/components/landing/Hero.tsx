'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useLocale } from '@/hooks/useLocale'
import { LEGAL_DOMAINS } from '@/lib/constants'

export default function Hero() {
  const { t } = useLocale()
  const domainsCount = LEGAL_DOMAINS.length

  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 md:pt-44 md:pb-24">
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
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur-md sm:px-4 sm:text-[11px] sm:tracking-[0.18em]"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--gold)]" />
            <span className="truncate">{t.hero.badge}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.05 }}
            className="font-serif text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-white sm:text-[60px] md:text-[80px] lg:text-[96px]"
          >
            <span className="gradient-text">{t.hero.title}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.25 }}
            className="mx-auto mt-8 max-w-2xl text-[15px] leading-[1.6] text-white/70 sm:mt-8 sm:text-[17px] md:mt-10 md:text-[19px] md:leading-[1.55]"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
            className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:mt-10 sm:flex-row sm:items-center"
          >
            <Link
              href="/signup"
              className="pulse-gold group relative inline-flex h-13 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-7 py-0 text-[15px] font-semibold text-[var(--justice-dark)] shadow-2xl shadow-[rgba(201,168,76,0.35)] transition hover:brightness-110 sm:h-14 sm:px-8 sm:text-base"
              style={{ height: '56px' }}
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
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-7 text-[15px] font-medium text-white/90 backdrop-blur-md transition hover:border-[var(--gold)]/60 hover:bg-white/10 sm:px-8 sm:text-base"
              style={{ height: '56px' }}
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

        {/* Stats — réels uniquement */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4"
        >
          <StatCard value={String(domainsCount)} label={t.hero.statsDomains} />
          <StatCard value="< 30 s" label={t.hero.statsTime} highlight />
          <StatCard value="14 j" label={t.hero.statsTrial} />
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
      className={`glass-dark rounded-2xl px-4 py-5 text-center transition hover:-translate-y-0.5 sm:p-5 ${
        highlight ? 'border-[var(--gold)]/40' : ''
      }`}
    >
      <div className="font-serif text-3xl font-semibold leading-none text-white sm:text-4xl">
        {value}
      </div>
      <div className="mt-2 text-[10px] uppercase tracking-wider text-white/60 sm:text-[11px]">
        {label}
      </div>
    </div>
  )
}
