'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import Tabs, { type TabItem } from '@/components/ui/Tabs'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { JurisCase, CaseStatus, CaseType } from '@/types'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  formatEuros,
  formatRelativeDate,
} from '@/lib/case-helpers'

const STATUS_TABS: Array<{ id: 'all' | CaseStatus; label: string }> = [
  { id: 'all', label: 'Tous' },
  { id: 'diagnostic', label: 'Diagnostic' },
  { id: 'analyse', label: 'Analyse' },
  { id: 'document_pret', label: 'Document prêt' },
  { id: 'envoye', label: 'Envoyé' },
  { id: 'resolu', label: 'Résolu' },
]

type SortKey = 'recent' | 'oldest' | 'probability'

export default function DossiersPage() {
  const [cases, setCases] = useState<JurisCase[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | CaseStatus>('all')
  const [typeFilter, setTypeFilter] = useState<CaseType | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch('/api/cases', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { cases: [] }))
      .then((d: { cases?: JurisCase[] }) => {
        if (active) setCases(d.cases ?? [])
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    let list = cases.slice()
    if (tab !== 'all') list = list.filter((c) => c.status === tab)
    if (typeFilter !== 'all') list = list.filter((c) => c.type === typeFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          (c.summary ?? '').toLowerCase().includes(q) ||
          (c.sub_type ?? '').toLowerCase().includes(q)
      )
    }
    switch (sort) {
      case 'recent':
        list.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        )
        break
      case 'oldest':
        list.sort(
          (a, b) =>
            new Date(a.updated_at).getTime() -
            new Date(b.updated_at).getTime()
        )
        break
      case 'probability':
        list.sort(
          (a, b) =>
            (b.success_probability ?? 0) - (a.success_probability ?? 0)
        )
        break
    }
    return list
  }, [cases, tab, typeFilter, search, sort])

  const tabItems: TabItem[] = STATUS_TABS.map((t) => ({
    id: t.id,
    label: t.label,
    count:
      t.id === 'all'
        ? cases.length
        : cases.filter((c) => c.status === t.id).length,
  }))

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Mes dossiers
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
            Tes dossiers juridiques
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Tous tes dossiers ouverts et résolus avec JurisIA.
          </p>
        </div>
        <Link href="/chat">
          <Button variant="primary" size="md">
            + Nouveau dossier
          </Button>
        </Link>
      </header>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3">
        <Tabs
          items={tabItems}
          value={tab}
          onChange={(id) => setTab(id as 'all' | CaseStatus)}
        />
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un dossier…"
              aria-label="Rechercher"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as CaseType | 'all')
            }
            className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--justice)]/50 focus:outline-none"
            aria-label="Filtrer par domaine"
          >
            <option value="all">Tous les domaines</option>
            {Object.entries(CASE_TYPE_LABELS).map(([id, info]) => (
              <option key={id} value={id}>
                {info.icon} {info.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-xl border border-[var(--border)] bg-white/80 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--justice)]/50 focus:outline-none"
            aria-label="Trier par"
          >
            <option value="recent">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="probability">Meilleures chances</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-white/60"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card padding="lg" className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--justice)]/10 text-3xl">
            📂
          </div>
          <h2 className="mb-1 font-serif text-xl font-semibold text-[var(--justice)]">
            {cases.length === 0
              ? 'Aucun dossier encore'
              : 'Aucun résultat'}
          </h2>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            {cases.length === 0
              ? 'Lance ton premier dossier en racontant ta situation à JurisIA.'
              : 'Essaie de modifier tes filtres ou ta recherche.'}
          </p>
          {cases.length === 0 && (
            <Link href="/chat">
              <Button variant="primary" size="md">
                Créer mon premier dossier
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {filtered.map((c) => {
            const typeInfo = CASE_TYPE_LABELS[c.type]
            const statusInfo = CASE_STATUS_LABELS[c.status]
            return (
              <li key={c.id}>
                <Link
                  href={`/chat/${c.id}`}
                  className="block rounded-2xl border border-[var(--border)] bg-white/70 p-4 transition-all hover:border-[var(--justice)]/30 hover:bg-white hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">
                        {typeInfo.icon}
                      </span>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                          {typeInfo.label}
                        </p>
                        <Badge variant={statusInfo.variant} size="sm">
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {formatRelativeDate(c.updated_at)}
                    </span>
                  </div>

                  <p className="mb-3 line-clamp-2 text-sm text-[var(--text-primary)]">
                    {c.summary ?? 'Dossier sans résumé'}
                  </p>

                  {c.success_probability != null && (
                    <div className="mb-2">
                      <Progress
                        value={c.success_probability}
                        label="Succès estimé"
                        showLabel
                      />
                    </div>
                  )}

                  {c.money_saved > 0 && (
                    <p className="text-xs font-semibold text-emerald-700">
                      💰 {formatEuros(c.money_saved)} potentiellement sauvés
                    </p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
