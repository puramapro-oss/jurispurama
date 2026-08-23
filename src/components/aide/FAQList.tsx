'use client'

import { FAQ_CATEGORIES, type FaqArticle } from '@/lib/faq'
import Reveal from '@/components/landing/Reveal'

interface FAQListProps {
  articles: FaqArticle[]
  openId: string | null
  onToggle: (id: string | null) => void
  onChatOpen: () => void
}

export default function FAQList({ articles, openId, onToggle, onChatOpen }: FAQListProps) {
  if (articles.length === 0) {
    return (
      <section className="relative py-12">
        <div className="container-wide">
          <div className="mx-auto max-w-3xl">
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
                onClick={onChatOpen}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-6 text-sm font-semibold text-[var(--justice-dark)] shadow-lg"
              >
                💬 Demander à JurisIA
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="relative py-12">
      <div className="container-wide">
        <div className="mx-auto max-w-3xl space-y-3">
          {articles.map((article, i) => {
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
                    onClick={() => onToggle(isOpen ? null : article.id)}
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
          })}
        </div>
      </div>
    </section>
  )
}
