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
  const [messages, setMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showEscalade, setShowEscalade] = useState(false)
  const [escName, setEscName] = useState('')
  const [escEmail, setEscEmail] = useState('')
  const [escMsg, setEscMsg] = useState('')
  const [escSending, setEscSending] = useState(false)

  const send = async () => {
    if (!input.trim() || sending) return
    const userMsg = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }]
    setMessages(newMessages)
    setSending(true)
    try {
      const res = await fetch('/api/aide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-8) }),
      })
      const json = await res.json()
      if (res.ok && json.reply) {
        setMessages([...newMessages, { role: 'assistant', content: json.reply }])
      } else {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content:
              json.error ?? 'Désolé, je n\'ai pas pu répondre. Réessaie ou contacte-nous.',
          },
        ])
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Erreur réseau. Réessaie.' },
      ])
    } finally {
      setSending(false)
    }
  }

  const sendEscalade = async () => {
    if (!escName || !escEmail || !escMsg) return
    setEscSending(true)
    try {
      const res = await fetch('/api/aide/escalade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: escName, email: escEmail, message: escMsg }),
      })
      const json = await res.json()
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              '✅ Ta demande a été transmise à notre équipe. Tu recevras une réponse par email sous 24h.',
          },
        ])
        setShowEscalade(false)
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: json.error ?? 'Erreur.' },
        ])
      }
    } catch {
      /* ignore */
    } finally {
      setEscSending(false)
    }
  }

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
        className="glass-dark relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl border-white/15 bg-[#05070F]/95 shadow-2xl"
        style={{ maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--justice)] via-[var(--justice-light)] to-[var(--gold)] text-xl">
              ⚖️
            </div>
            <div>
              <h2 className="font-serif text-lg font-semibold text-white">
                JurisIA — Support
              </h2>
              <p className="text-xs text-[var(--gold-light)]">
                En ligne &bull; 24h/24
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-white/50 hover:text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6" /></svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/85">
            Salut ! 👋 Pose-moi ta question sur JurisPurama. Pour un conseil juridique, connecte-toi au chat JurisIA.
          </div>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl p-3 text-sm ${
                m.role === 'user'
                  ? 'ml-8 bg-[var(--justice)]/20 text-white'
                  : 'mr-8 border border-white/10 bg-white/5 text-white/85'
              }`}
            >
              {m.content}
            </div>
          ))}
          {sending && (
            <div className="mr-8 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/50">
              JurisIA réfléchit...
            </div>
          )}
        </div>

        {/* Escalade form */}
        {showEscalade && (
          <div className="border-t border-white/10 px-6 py-4 space-y-3">
            <p className="text-xs font-semibold text-[var(--gold)]">
              Formulaire d&apos;escalade — un humain te répondra sous 24h
            </p>
            <input
              type="text"
              value={escName}
              onChange={(e) => setEscName(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              placeholder="Ton nom"
            />
            <input
              type="email"
              value={escEmail}
              onChange={(e) => setEscEmail(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              placeholder="Ton email"
            />
            <textarea
              value={escMsg}
              onChange={(e) => setEscMsg(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white"
              placeholder="Décris ton problème..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowEscalade(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white"
              >
                Annuler
              </button>
              <button
                onClick={sendEscalade}
                disabled={escSending}
                className="flex-1 rounded-xl bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--justice-dark)] disabled:opacity-50"
              >
                {escSending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        {!showEscalade && (
          <div className="border-t border-white/10 px-6 py-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/40"
                placeholder="Pose ta question..."
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                className="rounded-xl bg-[var(--justice)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
            <button
              onClick={() => setShowEscalade(true)}
              className="mt-2 text-xs text-[var(--gold-light)] hover:underline"
            >
              Ma question est trop complexe &rarr; contacter un humain
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
