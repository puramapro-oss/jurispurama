'use client'

import { useLocale } from '@/hooks/useLocale'
import Reveal from './Reveal'

export default function Testimonials() {
  const { t } = useLocale()

  const items = [
    {
      text: t.testimonials.t1Text,
      author: t.testimonials.t1Author,
      initials: 'ML',
      tone: 'from-[#1E3A5F] to-[#2A5384]',
    },
    {
      text: t.testimonials.t2Text,
      author: t.testimonials.t2Author,
      initials: 'ST',
      tone: 'from-[#2A5384] to-[#C9A84C]',
    },
    {
      text: t.testimonials.t3Text,
      author: t.testimonials.t3Author,
      initials: 'CB',
      tone: 'from-[#9C7F2E] to-[#C9A84C]',
    },
  ]

  return (
    <section className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Témoignages
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.testimonials.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/65 md:text-lg">
            {t.testimonials.subtitle}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
          {items.map((it, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <figure className="glass-dark flex h-full flex-col rounded-3xl p-7">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="text-[var(--gold)]/60"
                >
                  <path
                    d="M9.5 5C5.9 7.2 3.5 10.8 3.5 14.8c0 2.3 1.4 3.7 3.4 3.7 1.8 0 3-1.3 3-3s-1.2-2.9-2.9-2.9c-.5 0-.9.1-1.2.3.5-2.5 2.5-4.7 5-6L9.5 5zm10 0c-3.6 2.2-6 5.8-6 9.8 0 2.3 1.4 3.7 3.4 3.7 1.8 0 3-1.3 3-3s-1.2-2.9-2.9-2.9c-.5 0-.9.1-1.2.3.5-2.5 2.5-4.7 5-6L19.5 5z"
                    fill="currentColor"
                  />
                </svg>
                <blockquote className="mt-4 flex-1 font-serif text-lg italic leading-relaxed text-white/90 md:text-xl">
                  « {it.text} »
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${it.tone} text-sm font-bold text-white`}
                  >
                    {it.initials}
                  </div>
                  <div className="text-xs text-white/70">{it.author}</div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
