'use client'

import { useLocale } from '@/hooks/useLocale'
import Reveal from './Reveal'

export default function HowItWorks() {
  const { t } = useLocale()

  const steps = [
    {
      n: '01',
      title: t.how.step1Title,
      desc: t.how.step1Desc,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      n: '02',
      title: t.how.step2Title,
      desc: t.how.step2Desc,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      n: '03',
      title: t.how.step3Title,
      desc: t.how.step3Desc,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34" />
          <path d="M18 2l4 4-10 10H8v-4z" />
        </svg>
      ),
    },
    {
      n: '04',
      title: t.how.step4Title,
      desc: t.how.step4Desc,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4z" />
        </svg>
      ),
    },
  ]

  return (
    <section id="how" className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Le processus
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.how.title}
          </h2>
          <p className="mt-4 text-white/65 md:text-lg">{t.how.subtitle}</p>
        </Reveal>

        <div className="relative mx-auto max-w-6xl">
          {/* Connector line on desktop */}
          <div className="pointer-events-none absolute left-0 right-0 top-[52px] hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="relative h-full">
                  <div className="relative z-10 flex h-[104px] items-center justify-center">
                    <div className="flex h-[104px] w-[104px] items-center justify-center rounded-full border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--justice)] to-[var(--justice-dark)] text-[var(--gold-light)] shadow-2xl shadow-[rgba(201,168,76,0.15)]">
                      <div className="flex flex-col items-center gap-1">
                        {s.icon}
                        <span className="font-serif text-[11px] font-bold tracking-widest text-[var(--gold)]">
                          {s.n}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <h3 className="font-serif text-xl font-semibold text-white">
                      {s.title}
                    </h3>
                    <p className="mx-auto mt-2 max-w-[260px] text-sm leading-relaxed text-white/65">
                      {s.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
