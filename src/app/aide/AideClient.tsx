'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  FAQ_ARTICLES,
  FAQ_CATEGORIES,
  searchFaq,
  type FaqArticle,
  type FaqCategory,
} from '@/lib/faq'
import Reveal from '@/components/landing/Reveal'

export default function AideClient() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FaqCategory | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  const filtered: FaqArticle[] = useMemo(() => {
    const base = query.trim() ? searchFaq(query) : FAQ_ARTICLES
    if (category === 'all') return base
    return base.filter((a) => a.category === category)
  }, [query, category])

  return (
    <>
      {/* Hero */}
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

            {/* Search */}
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
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setOpenId(null)
                  }}
                  aria-label="Rechercher dans la FAQ"
                  className="w-full rounded-full border border-white/15 bg-white/5 py-4 pl-14 pr-6 text-sm text-white placeholder:text-white/40 backdrop-blur-md transition focus:border-[var(--gold)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20 md:text-base"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Category tabs */}
      <section className="relative py-6">
        <div className="container-wide">
          <Reveal className="mx-auto max-w-5xl">
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === 'all'
                    ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10 text-[var(--gold-light)]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
                }`}
              >
                <span>📚</span>
                <span>Toutes</span>
              </button>
              {FAQ_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    category === c.id
                      ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10 text-[var(--gold-light)]'
                      : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ list */}
      <section className="relative py-12">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl space-y-3">
            {filtered.length === 0 ? (
              <div className="glass-dark rounded-3xl p-10 text-center">
                <div className="text-4xl">🤔</div>
                <h3 className="mt-4 font-serif text-2xl font-semibold text-white">
                  Aucun résultat trouvé
                </h3>
                <p className="mt-2 text-white/70">
                  Mais JurisIA, notre assistant expert, peut te répondre
                  directement.
                </p>
                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-6 text-sm font-semibold text-[var(--justice-dark)] shadow-lg"
                >
                  💬 Demander à JurisIA
                </button>
              </div>
            ) : (
              filtered.map((article, i) => {
                const isOpen = openId === article.id
                return (
                  <Reveal key={article.id} delay={Math.min(i * 0.03, 0.3)}>
                    <div
                      className={`glass-dark rounded-2xl transition ${
                        isOpen ? 'border-[var(--gold)]/40' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : article.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-start justify-between gap-4 px-6 py-5 text-left"
                      >
                        <div className="flex-1">
                          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gold)]/80">
                            {
                              FAQ_CATEGORIES.find((c) => c.id === article.category)
                                ?.label
                            }
                          </div>
                          <span className="font-serif text-lg font-semibold text-white md:text-xl">
                            {article.question}
                          </span>
                        </div>
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className={`mt-1 flex-shrink-0 text-[var(--gold)] transition-transform ${
                            isOpen ? 'rotate-45' : ''
                          }`}
                          aria-hidden="true"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5 px-6 pb-6 pt-4 text-sm leading-relaxed text-white/75 md:text-base">
                          {article.answer}
                        </div>
                      )}
                    </div>
                  </Reveal>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* Help CTAs */}
      <section className="relative py-20">
        <div className="container-wide">
          <Reveal className="mx-auto max-w-4xl">
            <div className="grid gap-5 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setChatOpen(true)}
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

      {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}
    </>
  )
}

function ChatModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Assistant JurisIA"
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 px-3 pb-3 backdrop-blur-sm md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-dark relative w-full max-w-lg overflow-hidden rounded-3xl border-white/15 bg-[#05070F]/95 p-7 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 text-white/50 hover:text-white"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M6 18L18 6" />
          </svg>
        </button>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--justice)] via-[var(--justice-light)] to-[var(--gold)] text-xl">
            ⚖️
          </div>
          <div>
            <h2 className="font-serif text-xl font-semibold text-white">
              JurisIA — Support
            </h2>
            <p className="text-xs text-[var(--gold-light)]">En ligne • 24h/24</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/85">
          Salut ! 👋 Je suis JurisIA, ton assistant expert. Pour une vraie
          conversation avec moi, connecte-toi à ton espace — je pourrai alors
          analyser ton dossier en détail.
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-sm font-semibold text-[var(--justice-dark)] shadow-lg"
          >
            Créer mon compte gratuit
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 text-sm font-medium text-white"
          >
            Je suis déjà inscrit
          </Link>
        </div>
        <p className="mt-5 text-center text-xs text-white/45">
          Question urgente ? Écris-nous à{' '}
          <a
            href="mailto:contact@purama.dev"
            className="text-[var(--gold-light)] underline"
          >
            contact@purama.dev
          </a>
        </p>
      </div>
    </div>
  )
}
