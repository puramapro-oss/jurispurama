'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import Reveal from './Reveal'

export default function CTAFinal() {
  const { t } = useLocale()

  return (
    <section className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--gold)]/30 bg-gradient-to-br from-[#0B1526] via-[#132849] to-[#1f3a64] p-10 md:p-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-50"
              style={{
                background:
                  'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201, 168, 76, 0.18) 0%, transparent 60%)',
              }}
            />
            <div className="relative z-10 text-center">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
                {t.ctaFinal.title}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base text-white/75 md:text-lg">
                {t.ctaFinal.subtitle}
              </p>
              <div className="mt-9">
                <Link
                  href="/signup"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-9 text-base font-semibold text-[var(--justice-dark)] shadow-2xl shadow-[rgba(201,168,76,0.4)] transition hover:brightness-110"
                >
                  {t.ctaFinal.button}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    aria-hidden="true"
                    className="ml-2"
                  >
                    <path d="M5 12h14" />
                    <path d="M13 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <p className="mt-4 text-xs text-white/55">{t.hero.trust}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
