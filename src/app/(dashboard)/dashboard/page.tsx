'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getGreeting } from '@/lib/utils'
import ParrainageBlock from '@/components/home/ParrainageBlock'
import CrossPromoBlock from '@/components/home/CrossPromoBlock'
import StatsCard from '@/components/dashboard/StatsCard'
import CriticalDeadlineAlert from '@/components/dashboard/CriticalDeadlineAlert'
import ProfileProgressCard from '@/components/dashboard/ProfileProgressCard'
import DocumentsCard from '@/components/dashboard/DocumentsCard'
import NewCaseCTA from '@/components/dashboard/NewCaseCTA'
import EmptyCasesState from '@/components/dashboard/EmptyCasesState'
import CaseCard from '@/components/dashboard/CaseCard'
import LegalDomainsGrid from '@/components/dashboard/LegalDomainsGrid'
import type { JurisCase } from '@/types'
import { daysUntil, formatDeadline, formatEuros } from '@/lib/case-helpers'
import { profileCompletion, type LegalProfileInput } from '@/lib/profile-schema'

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
  const [legalProfile, setLegalProfile] =
    useState<Partial<LegalProfileInput> | null>(null)
  const [docsCount, setDocsCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/cases', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { cases: [] }))
      .then((d: { cases?: JurisCase[] }) => {
        if (active) setCases(d.cases ?? [])
      })
      .finally(() => active && setLoadingCases(false))

    fetch('/api/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { profile: {} }))
      .then((d: { profile?: Partial<LegalProfileInput> }) => {
        if (active) setLegalProfile(d.profile ?? {})
      })
      .catch(() => {
        if (active) setLegalProfile({})
      })

    fetch('/api/documents/generate', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { documents: [] }))
      .then((d: { documents?: unknown[] }) => {
        if (active) setDocsCount((d.documents ?? []).length)
      })
      .catch(() => {
        if (active) setDocsCount(0)
      })

    return () => {
      active = false
    }
  }, [])

  const profilePercent = useMemo(
    () => profileCompletion(legalProfile ?? {}),
    [legalProfile]
  )

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
        <p className="text-eyebrow">Tableau de bord</p>
        <h1 className="mt-1.5 text-display-3 text-[var(--justice)]">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] md:text-base">
          {authLoading
            ? 'Chargement de ton espace…'
            : 'Prêt à faire valoir tes droits ? JurisIA est à ta disposition.'}
        </p>
      </header>

      {/* Parrainage + écosystème (cohérent cabinet d'avocat — pas de bloc ambassadeur) */}
      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <ParrainageBlock />
        <CrossPromoBlock />
      </section>

      <CriticalDeadlineAlert deadlines={stats.criticalDeadlines} />

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <StatsCard
          label="Dossiers actifs"
          value={stats.activeCount}
          subtitle={`Plan ${profile?.subscription_plan ?? 'free'}`}
          loading={loadingCases}
        />
        <StatsCard
          label="Argent potentiellement sauvé"
          value={formatEuros(stats.totalSavings)}
          subtitle="Cumul tous dossiers"
          valueColor="rgb(4 120 87)"
          loading={loadingCases}
        />
        <StatsCard
          label="Prochaine échéance"
          value={stats.nextDeadline ? formatDeadline(stats.nextDeadline.date) : '—'}
          subtitle={stats.nextDeadline?.description ?? 'Aucune échéance'}
          loading={false}
        />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <ProfileProgressCard
          profilePercent={profilePercent}
          loading={legalProfile == null}
        />
        <DocumentsCard docsCount={docsCount} />
      </div>

      <NewCaseCTA />

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
          <EmptyCasesState />
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {recent.map((c) => (
              <li key={c.id}>
                <CaseCard case={c} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <LegalDomainsGrid />

    </div>
  )
}
