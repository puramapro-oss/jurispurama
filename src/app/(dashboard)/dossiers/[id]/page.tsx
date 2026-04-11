'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Progress from '@/components/ui/Progress'
import Tabs, { type TabItem } from '@/components/ui/Tabs'
import PhaseStepper from '@/components/chat/PhaseStepper'
import type { JurisCase, JurisDocument, JurisMessage } from '@/types'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  TIMELINE_COLOR_STYLES,
  buildTimeline,
  daysUntil,
  formatDeadline,
  formatEuros,
  formatRelativeDate,
} from '@/lib/case-helpers'
import { formatDate } from '@/lib/utils'

type TabId = 'timeline' | 'documents' | 'deadlines' | 'savings' | 'messages'

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const caseId = params.id

  const [caseRow, setCaseRow] = useState<JurisCase | null>(null)
  const [messages, setMessages] = useState<JurisMessage[]>([])
  const [documents, setDocuments] = useState<JurisDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('timeline')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/cases/${caseId}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) {
            toast.error('Dossier introuvable.')
            router.replace('/dossiers')
            return null
          }
          throw new Error('Impossible de charger ce dossier.')
        }
        return r.json() as Promise<{
          case: JurisCase
          messages: JurisMessage[]
          documents: JurisDocument[]
        }>
      })
      .then((data) => {
        if (!active || !data) return
        setCaseRow(data.case)
        setMessages(data.messages)
        setDocuments(data.documents)
      })
      .catch(() => {
        if (active) toast.error('Impossible de charger ce dossier.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [caseId, router])

  const handleArchive = useCallback(async () => {
    if (!confirm('Archiver ce dossier ? Il sera marqué comme résolu.')) return
    setDeleting(true)
    const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      toast.success('Dossier archivé.')
      router.push('/dossiers')
    } else {
      toast.error('Impossible d’archiver le dossier.')
    }
  }, [caseId, router])

  if (loading) {
    return (
      <div className="container-narrow py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-white/60" />
      </div>
    )
  }

  if (!caseRow) return null

  const typeInfo = CASE_TYPE_LABELS[caseRow.type]
  const statusInfo = CASE_STATUS_LABELS[caseRow.status]
  const deadlines = caseRow.deadlines ?? []
  const timeline = buildTimeline(caseRow, messages, documents)

  const tabItems: TabItem[] = [
    { id: 'timeline', label: 'Timeline', icon: '📍' },
    { id: 'messages', label: 'Échanges', icon: '💬', count: messages.length },
    {
      id: 'documents',
      label: 'Documents',
      icon: '📄',
      count: documents.length,
    },
    {
      id: 'deadlines',
      label: 'Délais',
      icon: '⏰',
      count: deadlines.length,
    },
    { id: 'savings', label: 'Gains', icon: '💰' },
  ]

  return (
    <div className="container-narrow py-6 md:py-10">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/dossiers" className="hover:text-[var(--justice)]">
            ← Mes dossiers
          </Link>
        </div>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--justice)]/10 text-3xl"
            >
              {typeInfo.icon}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
                {typeInfo.label}
                {caseRow.sub_type && ` · ${caseRow.sub_type.replace(/_/g, ' ')}`}
              </p>
              <h1 className="mt-1 font-serif text-2xl font-semibold text-[var(--justice)] md:text-3xl">
                {caseRow.summary ?? 'Dossier sans titre'}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                <span>Créé le {formatDate(caseRow.created_at)}</span>
                <span>·</span>
                <span>Mis à jour {formatRelativeDate(caseRow.updated_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/chat/${caseRow.id}`}>
              <Button variant="primary" size="md">
                Reprendre la conversation
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="md"
              onClick={handleArchive}
              loading={deleting}
            >
              Archiver
            </Button>
          </div>
        </div>
      </header>

      <PhaseStepper current={caseRow.status} className="mb-4" />

      {/* Stats cards */}
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card padding="md">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Probabilité de succès
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {caseRow.success_probability != null
              ? `${caseRow.success_probability}%`
              : '—'}
          </p>
          {caseRow.success_probability != null && (
            <div className="mt-2">
              <Progress value={caseRow.success_probability} />
            </div>
          )}
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Argent potentiellement sauvé
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-emerald-700">
            {formatEuros(caseRow.money_saved)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Prochaine échéance
          </p>
          <p className="mt-1 font-serif text-xl font-bold text-[var(--justice)]">
            {deadlines.length > 0 ? formatDeadline(deadlines[0].date) : '—'}
          </p>
          {deadlines.length > 0 && (
            <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
              {deadlines[0].description}
            </p>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        items={tabItems}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        className="mb-4"
      />

      {/* Tab content */}
      {tab === 'timeline' && (
        <Card padding="lg">
          <h2 className="mb-5 font-serif text-xl font-semibold text-[var(--justice)]">
            Historique du dossier
          </h2>
          {timeline.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Aucun événement pour le moment.
            </p>
          ) : (
            <ol className="relative space-y-5 md:border-l-2 md:border-[var(--border)] md:pl-6">
              {timeline.map((ev) => {
                const styles = TIMELINE_COLOR_STYLES[ev.color]
                const inner = (
                  <div className="group flex items-start gap-3">
                    <div
                      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${styles.dot} text-white shadow-sm md:absolute md:-left-[33px] md:h-7 md:w-7 md:text-sm`}
                      aria-hidden="true"
                    >
                      <span className="text-sm">{ev.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[10px] uppercase tracking-wider ${styles.text}`}
                      >
                        {formatDate(ev.at)} · {formatRelativeDate(ev.at)}
                      </p>
                      <p className="mt-0.5 font-semibold text-[var(--text-primary)]">
                        {ev.label}
                      </p>
                      {ev.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-secondary)]">
                          {ev.description}
                        </p>
                      )}
                      {ev.link && (
                        <Link
                          href={ev.link}
                          className="mt-1 inline-block text-xs font-semibold text-[var(--justice)] hover:underline"
                        >
                          Voir →
                        </Link>
                      )}
                    </div>
                  </div>
                )
                return (
                  <li key={ev.id} className="relative">
                    {inner}
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      )}

      {tab === 'messages' && (
        <Card padding="md">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Aucun échange pour le moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-[var(--border)] bg-white/60 p-3"
                >
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--justice)]">
                      {m.role === 'assistant' ? '⚖️ JurisIA' : '👤 Toi'}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {formatRelativeDate(m.created_at)}
                    </span>
                  </div>
                  <p className="line-clamp-3 text-sm text-[var(--text-primary)]">
                    {m.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-right">
            <Link
              href={`/chat/${caseRow.id}`}
              className="text-sm font-semibold text-[var(--justice)] hover:underline"
            >
              Ouvrir la conversation complète →
            </Link>
          </div>
        </Card>
      )}

      {tab === 'documents' && (
        <Card padding="lg">
          {documents.length === 0 ? (
            <div className="text-center">
              <div className="mb-3 text-5xl">📄</div>
              <h3 className="font-serif text-lg font-semibold text-[var(--justice)]">
                Aucun document encore
              </h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Les documents générés par JurisIA apparaîtront ici dès qu’ils
                seront prêts.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white/60 p-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {doc.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {doc.type} · {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      doc.signature_status === 'signed' ? 'green' : 'amber'
                    }
                  >
                    {doc.signature_status === 'signed'
                      ? 'Signé'
                      : 'En attente'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'deadlines' && (
        <Card padding="lg">
          {deadlines.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">
              Aucune échéance identifiée pour ce dossier.
            </p>
          ) : (
            <ul className="space-y-3">
              {deadlines.map((d, i) => {
                const days = daysUntil(d.date)
                const critical = d.critical || days <= 3
                return (
                  <li
                    key={i}
                    className={
                      critical
                        ? 'rounded-xl border border-red-200 bg-red-50/80 p-4'
                        : 'rounded-xl border border-[var(--border)] bg-white/60 p-4'
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`font-serif text-lg font-semibold ${
                          critical ? 'text-red-700' : 'text-[var(--justice)]'
                        }`}
                      >
                        {formatDeadline(d.date)}
                      </p>
                      {critical && (
                        <Badge variant="red">⚠ Critique</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {d.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Date limite : {formatDate(d.date)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      )}

      {tab === 'savings' && (
        <Card padding="lg">
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider text-emerald-600">
              Montant estimé économisé
            </p>
            <p className="mt-2 font-serif text-5xl font-bold text-emerald-700">
              {formatEuros(caseRow.money_saved)}
            </p>
            <p className="mt-3 max-w-md mx-auto text-sm text-[var(--text-secondary)]">
              Basé sur l&apos;analyse de JurisIA, c&apos;est le montant que tu
              pourrais récupérer, annuler ou ne pas avoir à payer si tu
              suis la stratégie recommandée.
            </p>
          </div>

          <MarkAsWonBox
            caseId={caseRow.id}
            currentAmount={caseRow.money_saved}
            currentStatus={caseRow.status}
            onUpdate={(next) => setCaseRow(next)}
          />
        </Card>
      )}
    </div>
  )
}

function MarkAsWonBox({
  caseId,
  currentAmount,
  currentStatus,
  onUpdate,
}: {
  caseId: string
  currentAmount: number
  currentStatus: string
  onUpdate: (next: JurisCase) => void
}) {
  const [amount, setAmount] = useState<string>(
    currentAmount ? String(currentAmount) : ''
  )
  const [saving, setSaving] = useState(false)
  const isResolved = currentStatus === 'resolu'

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Indique un montant valide en euros.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          money_saved: value,
          status: 'resolu',
        }),
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { case: JurisCase }
      onUpdate(data.case)
      toast.success(
        `🏆 Dossier résolu — ${formatEuros(value)} économisés !`
      )
    } catch {
      toast.error('Impossible de valider ce gain.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-xs uppercase tracking-wider text-emerald-700">
        {isResolved
          ? 'Dossier résolu'
          : 'Marquer comme résolu'}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {isResolved
          ? 'Tu peux mettre à jour le montant économisé si besoin.'
          : 'Quand ton dossier est gagné, indique combien tu as économisé ou récupéré.'}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="1"
            placeholder="Ex : 450"
            className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-700">
            €
          </span>
        </div>
        <Button
          variant="gold"
          size="md"
          onClick={submit}
          loading={saving}
        >
          🏆 {isResolved ? 'Mettre à jour' : 'Valider le gain'}
        </Button>
      </div>
    </div>
  )
}
