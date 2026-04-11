'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'general', label: 'Question générale' },
  { value: 'commercial', label: 'Commercial / tarifs' },
  { value: 'bug', label: 'Signaler un bug' },
  { value: 'legal', label: 'Question juridique' },
  { value: 'presse', label: 'Presse / partenariat' },
  { value: 'rgpd', label: 'RGPD / données personnelles' },
]

interface FormState {
  name: string
  email: string
  category: string
  subject: string
  message: string
}

const INITIAL: FormState = {
  name: '',
  email: '',
  category: 'general',
  subject: '',
  message: '',
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    if (submitting) return

    if (form.name.trim().length < 2) {
      toast.error('Merci d\'indiquer ton nom.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error('Email invalide.')
      return
    }
    if (form.subject.trim().length < 3) {
      toast.error('Merci de préciser un sujet.')
      return
    }
    if (form.message.trim().length < 10) {
      toast.error('Message trop court.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Envoi refusé. Réessaie dans quelques instants.')
      }
      setSubmitted(true)
      toast.success('Message envoyé ! On te répond sous 24h ouvrées.')
      setForm(INITIAL)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="glass-dark rounded-3xl p-8 text-center">
        <div className="text-4xl">✅</div>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-white">
          Message bien reçu
        </h2>
        <p className="mt-2 text-white/70">
          Merci pour ton message. L&apos;équipe te répond sous 24h ouvrées à
          l&apos;adresse que tu as indiquée.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 text-sm font-medium text-white hover:border-[var(--gold)]/60"
        >
          Envoyer un autre message
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="glass-dark space-y-4 rounded-3xl p-6 md:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Nom"
          required
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Marie Dupont"
          name="name"
        />
        <Field
          label="Email"
          required
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="marie@exemple.fr"
          name="email"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
          Catégorie
        </label>
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white backdrop-blur-md focus:border-[var(--gold)]/60 focus:outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-[#0A0E1A]">
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <Field
        label="Sujet"
        required
        value={form.subject}
        onChange={(v) => setForm({ ...form, subject: v })}
        placeholder="Sujet de ta demande"
        name="subject"
      />
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
          Message *
        </label>
        <textarea
          required
          rows={6}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Décris ta demande en détail..."
          className="w-full resize-y rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 backdrop-blur-md focus:border-[var(--gold)]/60 focus:outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-13 w-full items-center justify-center rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-6 py-3.5 text-sm font-semibold text-[var(--justice-dark)] shadow-lg shadow-[rgba(201,168,76,0.28)] transition hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? 'Envoi...' : 'Envoyer mon message'}
      </button>
      <p className="text-center text-[11px] text-white/40">
        En envoyant ce formulaire, tu acceptes que SASU PURAMA traite tes données
        dans le cadre de notre politique de confidentialité (RGPD).
      </p>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  name,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  name?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/60">
        {label}
        {required && ' *'}
      </label>
      <input
        type={type}
        required={required}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 backdrop-blur-md focus:border-[var(--gold)]/60 focus:outline-none"
      />
    </div>
  )
}
