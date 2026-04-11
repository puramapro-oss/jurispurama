'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { DOCUMENT_TEMPLATE_LABELS, type DocumentTemplate } from '@/lib/pdf/types'

interface DocumentRow {
  id: string
  case_id: string
  type: string
  title: string
  pdf_url: string | null
  signature_status: 'pending' | 'signed' | 'expired'
  sent_status:
    | 'not_sent'
    | 'sent_email'
    | 'sent_recommande'
    | 'sent_teleservice'
  created_at: string
  case_summary: string | null
  case_type: string | null
}

type SortMode = 'recent' | 'oldest' | 'title'

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<'all' | DocumentTemplate>('all')
  const [sigFilter, setSigFilter] = useState<'all' | 'pending' | 'signed'>(
    'all'
  )
  const [sort, setSort] = useState<SortMode>('recent')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/documents/generate', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d: { documents?: DocumentRow[] }) => {
        if (active) setDocs(d.documents ?? [])
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    let out = docs.slice()
    if (typeFilter !== 'all') out = out.filter((d) => d.type === typeFilter)
    if (sigFilter !== 'all')
      out = out.filter((d) => d.signature_status === sigFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      out = out.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.case_summary ?? '').toLowerCase().includes(q)
      )
    }
    out.sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title)
      const da = new Date(a.created_at).getTime()
      const db = new Date(b.created_at).getTime()
      return sort === 'recent' ? db - da : da - db
    })
    return out
  }, [docs, typeFilter, sigFilter, sort, query])

  const typeOptions: Array<{ value: 'all' | DocumentTemplate; label: string }> =
    [
      { value: 'all', label: 'Tous les types' },
      ...(Object.entries(DOCUMENT_TEMPLATE_LABELS) as Array<
        [DocumentTemplate, string]
      >).map(([value, label]) => ({ value, label })),
    ]

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Documents générés
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Mes documents juridiques
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Tous les actes générés par JurisIA. Télécharge, signe ou envoie-les.
        </p>
      </header>

      <Card padding="md" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un document…"
            className="rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
          />
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | DocumentTemplate)
            }
            className="rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)]"
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={sigFilter}
            onChange={(e) =>
              setSigFilter(e.target.value as 'all' | 'pending' | 'signed')
            }
            className="rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)]"
          >
            <option value="all">Tous statuts</option>
            <option value="pending">À signer</option>
            <option value="signed">Signés</option>
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)]"
          >
            <option value="recent">Récents d&apos;abord</option>
            <option value="oldest">Anciens d&apos;abord</option>
            <option value="title">Par titre A→Z</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white/60"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="mb-3 text-5xl">📄</div>
          <h2 className="mb-2 font-serif text-xl font-semibold text-[var(--justice)]">
            Aucun document pour l&apos;instant
          </h2>
          <p className="mx-auto mb-5 max-w-md text-sm text-[var(--text-secondary)]">
            Démarre un dossier avec JurisIA ou génère ton premier document
            juridique depuis un dossier existant.
          </p>
          <Link href="/chat">
            <Button variant="primary">Démarrer un dossier</Button>
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((d) => (
            <li key={d.id}>
              <Link
                href={`/documents/${d.id}`}
                className="block h-full rounded-2xl border border-[var(--border)] bg-white/70 p-5 transition-all hover:border-[var(--justice)]/30 hover:bg-white hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📄</span>
                    <Badge variant="purple" size="sm">
                      {DOCUMENT_TEMPLATE_LABELS[d.type as DocumentTemplate] ??
                        d.type}
                    </Badge>
                  </div>
                  <Badge
                    variant={
                      d.signature_status === 'signed' ? 'green' : 'amber'
                    }
                    size="sm"
                  >
                    {d.signature_status === 'signed'
                      ? 'Signé'
                      : 'À signer'}
                  </Badge>
                </div>
                <h3 className="line-clamp-2 font-serif text-lg font-semibold text-[var(--justice)]">
                  {d.title}
                </h3>
                {d.case_summary && (
                  <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">
                    Dossier : {d.case_summary}
                  </p>
                )}
                <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                  Généré le{' '}
                  {new Date(d.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
