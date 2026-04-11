'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import ChatInput from '@/components/chat/ChatInput'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { LEGAL_DOMAINS } from '@/lib/constants'
import type { JurisCase, CaseType } from '@/types'
import {
  CASE_STATUS_LABELS,
  formatRelativeDate,
} from '@/lib/case-helpers'

export default function NewCasePage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [selectedType, setSelectedType] = useState<CaseType | null>(null)
  const [recentCases, setRecentCases] = useState<JurisCase[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/cases', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { cases: [] }))
      .then((d: { cases?: JurisCase[] }) => {
        if (!active) return
        setRecentCases((d.cases ?? []).slice(0, 5))
      })
      .finally(() => active && setLoadingRecent(false))
    return () => {
      active = false
    }
  }, [])

  const handleStart = () => {
    const text = message.trim()
    if (!text) {
      toast.error('Raconte ta situation en quelques phrases.')
      return
    }
    setSubmitting(true)
    // We pass the initial message via sessionStorage — the [caseId=new] page
    // will send it immediately on mount. No round-trip before nav.
    try {
      sessionStorage.setItem(
        'jurispurama:pending_message',
        JSON.stringify({
          message: text,
          type: selectedType,
          ts: Date.now(),
        })
      )
    } catch {
      // sessionStorage blocked — we still navigate, the user will need to retype
    }
    router.push('/chat/new')
  }

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-6 md:mb-8">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Nouveau dossier juridique
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Raconte ta situation à JurisIA
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] md:text-base">
          Décris ton problème avec tes propres mots. JurisIA identifie le
          domaine juridique, pose les questions pertinentes et construit ton
          dossier en temps réel.
        </p>
      </header>

      {/* 12 legal domains */}
      <section aria-labelledby="domain-heading" className="mb-6">
        <h2
          id="domain-heading"
          className="mb-3 text-sm font-semibold text-[var(--justice)]"
        >
          Ou choisis directement un domaine (optionnel) :
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {LEGAL_DOMAINS.map((d) => {
            const active = selectedType === d.id
            return (
              <button
                key={d.id}
                type="button"
                onClick={() =>
                  setSelectedType((curr) =>
                    curr === d.id ? null : (d.id as CaseType)
                  )
                }
                aria-pressed={active}
                className={[
                  'flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-all',
                  active
                    ? 'border-[var(--justice)] bg-[var(--justice)]/10 text-[var(--justice)] shadow-sm'
                    : 'border-[var(--border)] bg-white/60 text-[var(--text-primary)] hover:border-[var(--justice)]/30 hover:bg-white',
                ].join(' ')}
              >
                <span className="text-xl" aria-hidden="true">
                  {d.icon}
                </span>
                <span className="truncate">{d.label}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Chat input */}
      <section aria-labelledby="input-heading" className="mb-8">
        <h2 id="input-heading" className="sr-only">
          Décris ton problème
        </h2>
        <ChatInput
          value={message}
          onChange={setMessage}
          onSubmit={handleStart}
          disabled={submitting}
          autoFocus
          placeholder={
            selectedType
              ? `Décris ta situation de ${LEGAL_DOMAINS.find((d) => d.id === selectedType)?.label.toLowerCase()}…`
              : 'Ex. J\'ai reçu une amende ANTAI de 90€ pour excès de vitesse sur l\'A36, flashé à 138 km/h au lieu de 130, je n\'étais pas au volant…'
          }
        />
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          🔒 Tes échanges sont confidentiels et protégés par le secret
          juridique numérique. Tu restes propriétaire de tes données.
        </p>
      </section>

      {/* Recent cases */}
      <section aria-labelledby="recent-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2
            id="recent-heading"
            className="font-serif text-xl font-semibold text-[var(--justice)]"
          >
            Dossiers récents
          </h2>
          <Link
            href="/dossiers"
            className="text-xs font-semibold text-[var(--justice)] hover:underline"
          >
            Tout voir →
          </Link>
        </div>

        {loadingRecent ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl bg-white/60"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : recentCases.length === 0 ? (
          <Card padding="md" className="text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Aucun dossier pour l&apos;instant. Envoie ton premier message
              ci-dessus pour démarrer.
            </p>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {recentCases.map((c) => {
              const statusInfo = CASE_STATUS_LABELS[c.status]
              return (
                <li key={c.id}>
                  <Link
                    href={`/chat/${c.id}`}
                    className="block rounded-xl border border-[var(--border)] bg-white/70 p-3 transition-all hover:border-[var(--justice)]/30 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {formatRelativeDate(c.updated_at)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-[var(--text-primary)]">
                      {c.summary ?? 'Dossier sans titre'}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
