'use client'

import Reveal from '@/components/landing/Reveal'

interface HeroSectionProps {
  query: string
  onQueryChange: (query: string) => void
}

export default function HeroSection({ query, onQueryChange }: HeroSectionProps) {
  return (
    <section className="relative pb-10">
      <div className="container-wide">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
            Centre d&apos;aide
          </p>
          <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
            Comment pouvons-nous t&apos;aider ?
          </h1>
          <p className="mt-5 text-white/70 md:text-lg">
            Plus de 18 questions/réponses organisées par catégorie. Recherche
            instantanée. Si tu ne trouves pas, notre assistant IA JurisIA est
            disponible en 1 clic, 24h/24.
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
                className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-4-4" />
              </svg>
              <input
                type="search"
                placeholder="Rechercher une réponse..."
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                aria-label="Rechercher dans la FAQ"
                className="w-full rounded-full border border-white/15 bg-white/5 py-4 pl-14 pr-6 text-sm text-white placeholder:text-white/40 backdrop-blur-md transition focus:border-[var(--gold)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20 md:text-base"
              />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
