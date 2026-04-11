'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocale } from '@/hooks/useLocale'
import Reveal from './Reveal'

export default function LandingFAQ() {
  const { t } = useLocale()
  const [open, setOpen] = useState<number | null>(0)

  const items = [
    { q: t.faq.q1, a: t.faq.a1 },
    { q: t.faq.q2, a: t.faq.a2 },
    { q: t.faq.q3, a: t.faq.a3 },
    { q: t.faq.q4, a: t.faq.a4 },
    { q: t.faq.q5, a: t.faq.a5 },
    { q: t.faq.q6, a: t.faq.a6 },
  ]

  return (
    <section className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            FAQ
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.faq.title}
          </h2>
        </Reveal>

        <div className="mx-auto max-w-3xl space-y-3">
          {items.map((item, i) => {
            const isOpen = open === i
            return (
              <Reveal key={i} delay={i * 0.04}>
                <div
                  className={`glass-dark rounded-2xl transition ${
                    isOpen ? 'border-[var(--gold)]/40' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-serif text-lg font-semibold text-white md:text-xl">
                      {item.q}
                    </span>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      aria-hidden="true"
                      className={`mt-1 flex-shrink-0 text-[var(--gold)] transition-transform ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                    >
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/5 px-6 pb-6 pt-4 text-sm leading-relaxed text-white/75 md:text-base">
                          {item.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
