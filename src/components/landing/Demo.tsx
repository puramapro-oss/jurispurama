'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale } from '@/hooks/useLocale'
import Reveal from './Reveal'

export default function Demo() {
  const { t } = useLocale()
  const [showUser, setShowUser] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [showDoc, setShowDoc] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setShowUser(true), 400)
    const t2 = setTimeout(() => setShowAi(true), 1400)
    const t3 = setTimeout(() => setShowDoc(true), 3200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  const aiLines = t.demo.aiReply.split('\n\n')

  return (
    <section className="relative py-24 md:py-32">
      <div className="container-wide">
        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Démo en direct
          </p>
          <h2 className="mt-3 font-serif text-3xl font-semibold italic leading-tight text-white md:text-5xl">
            {t.demo.title}
          </h2>
          <p className="mt-4 text-white/65 md:text-lg">{t.demo.subtitle}</p>
        </Reveal>

        <Reveal delay={0.15} className="mx-auto max-w-3xl">
          <div className="glass-dark rounded-3xl border border-white/10 p-5 md:p-8">
            {/* Mock header */}
            <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              </div>
              <span className="text-xs text-white/50">JurisIA — chat en direct</span>
            </div>

            {/* User message */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={showUser ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="mb-4 flex justify-end"
            >
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[var(--justice-light)]/40 px-4 py-3 text-sm text-white backdrop-blur-md md:text-base">
                {t.demo.userMessage}
              </div>
            </motion.div>

            {/* AI reply */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={showAi ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="mb-5 flex items-start gap-3"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] via-[var(--justice-light)] to-[var(--gold)] text-base">
                ⚖️
              </div>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-5 py-4 text-sm leading-relaxed text-white/90 md:text-base">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--gold)]">
                  JurisIA
                </div>
                {aiLines.map((line, i) => (
                  <p key={i} className={i === 0 ? '' : 'mt-3 whitespace-pre-line'}>
                    {line.split(/(article R417-10|Article R417-10|artículo R417-10)/).map((frag, j) =>
                      /R417-10/.test(frag) ? (
                        <span
                          key={j}
                          className="rounded bg-[var(--gold)]/20 px-1.5 py-0.5 font-semibold text-[var(--gold-light)]"
                        >
                          {frag}
                        </span>
                      ) : (
                        <span key={j}>{frag}</span>
                      )
                    )}
                  </p>
                ))}
              </div>
            </motion.div>

            {/* Action button */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={showDoc ? { opacity: 1, scale: 1 } : {}}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="flex justify-end"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-5 py-2.5 text-sm font-semibold text-[var(--justice-dark)] shadow-lg shadow-[rgba(201,168,76,0.25)]">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path
                    d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t.demo.generateDoc}
              </div>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
