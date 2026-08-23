'use client'

import Link from 'next/link'
import Reveal from '@/components/landing/Reveal'

interface HelpCTAsProps {
  onChatOpen: () => void
}

export default function HelpCTAs({ onChatOpen }: HelpCTAsProps) {
  return (
    <section className="relative py-20">
      <div className="container-wide">
        <Reveal className="mx-auto max-w-4xl">
          <div className="grid gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={onChatOpen}
              className="glass-dark group flex items-start gap-4 rounded-3xl p-7 text-left transition hover:-translate-y-1 hover:border-[var(--gold)]/40"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-2xl">
                💬
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-white">
                  Chat avec JurisIA
                </h3>
                <p className="mt-1.5 text-sm text-white/65">
                  Pose ta question en langage naturel. Réponse instantanée, 24h/24.
                </p>
              </div>
            </button>
            <Link
              href="/contact"
              className="glass-dark group flex items-start gap-4 rounded-3xl p-7 transition hover:-translate-y-1 hover:border-[var(--gold)]/40"
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--gold)]/15 text-2xl">
                ✉️
              </div>
              <div>
                <h3 className="font-serif text-xl font-semibold text-white">
                  Écrire à l&apos;équipe
                </h3>
                <p className="mt-1.5 text-sm text-white/65">
                  Pour les demandes complexes ou spécifiques. Réponse sous 24h.
                </p>
              </div>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
