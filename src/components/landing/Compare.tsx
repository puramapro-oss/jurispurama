'use client'

import { useLocale } from '@/hooks/useLocale'
import Reveal from './Reveal'

export default function Compare() {
  const { t } = useLocale()

  const rows = [
    {
      label: t.compare.rowPrice,
      lawyer: t.compare.lawyerPrice,
      juris: t.compare.jurisPrice,
    },
    {
      label: t.compare.rowDelay,
      lawyer: t.compare.lawyerDelay,
      juris: t.compare.jurisDelay,
    },
    {
      label: t.compare.rowAccess,
      lawyer: t.compare.lawyerAccess,
      juris: t.compare.jurisAccess,
    },
    {
      label: t.compare.rowClarity,
      lawyer: t.compare.lawyerClarity,
      juris: t.compare.jurisClarity,
    },
    {
      label: t.compare.rowSources,
      lawyer: t.compare.lawyerSources,
      juris: t.compare.jurisSources,
    },
  ]

  return (
    <section className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Comparatif
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.compare.title}
          </h2>
        </Reveal>

        <Reveal delay={0.15} className="mx-auto max-w-4xl">
          <div className="glass-dark overflow-hidden rounded-3xl border-white/10">
            {/* Header row */}
            <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/10 bg-black/20 text-xs font-semibold uppercase tracking-wider md:grid-cols-[1fr_1fr_1fr]">
              <div className="px-4 py-4 text-white/40 md:px-6" />
              <div className="border-l border-white/10 px-4 py-4 text-white/60 md:px-6">
                {t.compare.lawyer}
              </div>
              <div className="border-l border-[var(--gold)]/25 bg-gradient-to-b from-[var(--gold)]/10 to-transparent px-4 py-4 text-[var(--gold)] md:px-6">
                {t.compare.juris}
              </div>
            </div>
            {rows.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1.2fr_1fr_1fr] text-sm md:grid-cols-[1fr_1fr_1fr] md:text-base ${
                  i % 2 === 1 ? 'bg-white/[0.015]' : ''
                }`}
              >
                <div className="px-4 py-4 font-semibold text-white/85 md:px-6 md:py-5">
                  {row.label}
                </div>
                <div className="border-l border-white/10 px-4 py-4 text-white/55 md:px-6 md:py-5">
                  {row.lawyer}
                </div>
                <div className="border-l border-[var(--gold)]/25 bg-gradient-to-b from-[var(--gold)]/5 to-transparent px-4 py-4 font-medium text-white md:px-6 md:py-5">
                  {row.juris}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
