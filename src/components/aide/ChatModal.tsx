'use client'

import { useState } from 'react'
import AIDisclosure from '@/lib/legal/components/AIDisclosure'
import { APP_NAME } from '@/lib/constants'

interface ChatModalProps {
  onClose: () => void
}

export default function ChatModal({ onClose }: ChatModalProps) {
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

        <AIDisclosure appName={APP_NAME} className="border-b border-white/10 px-6 py-2 text-[11px] text-white/50" />

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
