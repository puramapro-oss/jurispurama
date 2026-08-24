'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import MarkAsWonBox from '@/components/dossiers/MarkAsWonBox'
import type { JurisCase, JurisDocument, JurisMessage } from '@/types'
import {
  TIMELINE_COLOR_STYLES,
  formatDeadline,
  formatRelativeDate,
  daysUntil,
  formatEuros,
  type TimelineEvent,
} from '@/lib/case-helpers'
import { formatDate } from '@/lib/utils'

type TabId = 'timeline' | 'documents' | 'deadlines' | 'savings' | 'messages'

interface CaseTabContentProps {
  tab: TabId
  caseRow: JurisCase
  messages: JurisMessage[]
  documents: JurisDocument[]
  timeline: TimelineEvent[]
  deadlines: Array<{ date: string; description: string; critical?: boolean }>
  onCaseUpdate: (next: JurisCase) => void
}

export default function CaseTabContent({
  tab,
  caseRow,
  messages,
  documents,
  timeline,
  deadlines,
  onCaseUpdate,
}: CaseTabContentProps) {
  if (tab === 'timeline') {
    return (
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
              return (
                <li key={ev.id} className="relative">
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
                </li>
              )
            })}
          </ol>
        )}
      </Card>
    )
  }

  if (tab === 'messages') {
    return (
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
    )
  }

  if (tab === 'documents') {
    return (
      <Card padding="lg">
        {documents.length === 0 ? (
          <div className="text-center">
            <div className="mb-3 text-5xl">📄</div>
            <h3 className="font-serif text-lg font-semibold text-[var(--justice)]">
              Aucun document encore
            </h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Les documents générés par JurisIA apparaîtront ici dès qu&apos;ils
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
                  {doc.signature_status === 'signed' ? 'Signé' : 'En attente'}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    )
  }

  if (tab === 'deadlines') {
    return (
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
                    {critical && <Badge variant="red">⚠ Critique</Badge>}
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
    )
  }

  if (tab === 'savings') {
    return (
      <Card padding="lg">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-emerald-600">
            Montant estimé économisé
          </p>
          <p className="mt-2 font-serif text-5xl font-bold text-emerald-700">
            {formatEuros(caseRow.money_saved)}
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm text-[var(--text-secondary)]">
            Basé sur l&apos;analyse de JurisIA, c&apos;est le montant que tu
            pourrais récupérer, annuler ou ne pas avoir à payer si tu suis la
            stratégie recommandée.
          </p>
        </div>
        <MarkAsWonBox
          caseId={caseRow.id}
          currentAmount={caseRow.money_saved}
          currentStatus={caseRow.status}
          onUpdate={onCaseUpdate}
        />
      </Card>
    )
  }

  return null
}
