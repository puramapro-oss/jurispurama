'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getGreeting } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import { LEGAL_DOMAINS } from '@/lib/constants'
import type { JurisCase } from '@/types'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  daysUntil,
  formatDeadline,
  formatEuros,
  formatRelativeDate,
} from '@/lib/case-helpers'

interface DeadlineItem {
  caseId: string
  caseSummary: string
  date: string
  description: string
  critical: boolean
  days: number
}

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth()
  const [cases, setCases] = useState<JurisCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/cases', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { cases: [] }))
      .then((d: { cases?: JurisCase[] }) => {
        if (active) setCases(d.cases ?? [])
      })
      .finally(() => active && setLoadingCases(false))
    return () => {
      active = false
    }
  }, [])

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  const stats = useMemo(() => {
    const active = cases.filter((c) => c.status !== 'resolu')
    const totalSavings = cases.reduce((sum, c) => sum + (c.money_saved || 0), 0)
    const allDeadlines: DeadlineItem[] = cases.flatMap((c) =>
      (c.deadlines ?? []).map((d) => ({
        caseId: c.id,
        caseSummary: c.summary ?? 'Dossier',
        date: d.date,
        description: d.description,
        critical: d.critical,
        days: daysUntil(d.date),
      }))
    )
    const upcoming = allDeadlines
      .filter((d) => d.days >= 0)
      .sort((a, b) => a.days - b.days)
    const critical = upcoming.filter((d) => d.critical || d.days <= 3)
    return {
      activeCount: active.length,
      totalSavings,
      nextDeadline: upcoming[0] ?? null,
      criticalDeadlines: critical,
    }
  }, [cases])

  const recent = cases.slice(0, 3)

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Tableau de bord
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
          {authLoading
            ? 'Chargement de ton espace…'
            : 'Prêt à faire valoir tes droits ? JurisIA est à ta disposition.'}
        </p>
      </header>

      {/* Critical deadline alert */}
      {stats.criticalDeadlines.length > 0 && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">
              ⚠️
            </span>
            <div className="flex-1">
              <p className="font-semibold text-red-800">
                {stats.criticalDeadlines.length} échéance
                {stats.criticalDeadlines.length > 1 ? 's' : ''} critique
                {stats.criticalDeadlines.length > 1 ? 's' : ''}
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-red-700">
                {stats.criticalDeadlines.slice(0, 3).map((d, i) => (
                  <li key={`${d.caseId}-${i}`}>
                    <Link
                      href={`/dossiers/${d.caseId}`}
                      className="hover:underline"
                    >
                      <strong>{formatDeadline(d.date)}</strong> — {d.description}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Card padding="md">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Dossiers actifs
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {loadingCases ? '…' : stats.activeCount}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Plan actuel :{' '}
            <span className="font-semibold capitalize">
              {profile?.subscription_plan ?? 'free'}
            </span>
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Argent potentiellement sauvé
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-emerald-700">
            {loadingCases ? '…' : formatEuros(stats.totalSavings)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Cumul sur tous tes dossiers
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Prochaine échéance
          </p>
          <p className="mt-1 font-serif text-xl font-bold text-[var(--justice)]">
            {stats.nextDeadline ? formatDeadline(stats.nextDeadline.date) : '—'}
          </p>
          <p className="mt-1 line-clamp-1 text-xs text-[var(--text-secondary)]">
            {stats.nextDeadline?.description ?? 'Aucune échéance'}
          </p>
        </Card>
      </div>

      {/* CTA */}
      <Card
        padding="lg"
        className="mb-8 border-none bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)]"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-serif text-2xl font-semibold text-white md:text-3xl">
              Nouveau dossier juridique
            </h2>
            <p className="mt-2 text-white/80">
              Raconte ton problème à JurisIA. En 3 minutes, tu as un plan
              d&apos;action, les articles de loi qui te protègent et un
              document prêt à signer.
            </p>
          </div>
          <Link href="/chat">
            <Button variant="gold" size="lg">
              Démarrer un dossier
            </Button>
          </Link>
        </div>
      </Card>

      {/* Recent cases */}
      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
            Mes dossiers récents
          </h2>
          <Link
            href="/dossiers"
            className="text-sm font-semibold text-[var(--justice)] hover:underline"
          >
            Tout voir →
          </Link>
        </div>

        {loadingCases ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl bg-white/60"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <Card padding="lg" className="text-center">
            <div className="mb-3 text-5xl">📂</div>
            <h3 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Bienvenue sur JurisPurama
            </h3>
            <p className="mt-2 mb-6 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Raconte ton premier problème juridique à JurisIA. Un dossier
              sera créé automatiquement et tu pourras y revenir à tout moment.
            </p>
            <Link href="/chat">
              <Button variant="primary" size="md">
                Créer mon premier dossier
              </Button>
            </Link>
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {recent.map((c) => {
              const typeInfo = CASE_TYPE_LABELS[c.type]
              const statusInfo = CASE_STATUS_LABELS[c.status]
              return (
                <li key={c.id}>
                  <Link
                    href={`/chat/${c.id}`}
                    className="block h-full rounded-2xl border border-[var(--border)] bg-white/70 p-4 transition-all hover:border-[var(--justice)]/30 hover:bg-white hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xl" aria-hidden="true">
                        {typeInfo.icon}
                      </span>
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm font-medium text-[var(--text-primary)]">
                      {c.summary ?? 'Dossier sans titre'}
                    </p>
                    {c.success_probability != null && (
                      <div className="mt-2">
                        <Progress value={c.success_probability} />
                      </div>
                    )}
                    <p className="mt-2 text-[11px] text-[var(--text-muted)]">
                      {formatRelativeDate(c.updated_at)}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Legal domains */}
      <section>
        <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
          Les 12 domaines du droit couverts
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {LEGAL_DOMAINS.map((d) => (
            <div
              key={d.id}
              className="glass flex items-center gap-3 rounded-xl p-4"
            >
              <span className="text-2xl" aria-hidden="true">
                {d.icon}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
