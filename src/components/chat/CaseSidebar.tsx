'use client'

import Link from 'next/link'
import type { JurisCase } from '@/types'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  formatDeadline,
  formatEuros,
  daysUntil,
} from '@/lib/case-helpers'
import { cn } from '@/lib/utils'

interface CaseSidebarProps {
  caseRow: JurisCase | null
  onActionClick: (action: CaseSidebarAction) => void
  className?: string
}

export type CaseSidebarAction =
  | 'generate_document'
  | 'sign'
  | 'send_recommande'
  | 'view_full'
  | 'new_case'

export default function CaseSidebar({
  caseRow,
  onActionClick,
  className,
}: CaseSidebarProps) {
  const typeInfo = caseRow ? CASE_TYPE_LABELS[caseRow.type] : null
  const statusInfo = caseRow ? CASE_STATUS_LABELS[caseRow.status] : null
  const deadlines = caseRow?.deadlines ?? []

  return (
    <aside
      className={cn(
        'flex w-full flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white/75 p-4 backdrop-blur-xl lg:h-fit lg:sticky lg:top-6 lg:w-80',
        className
      )}
      aria-label="Détails du dossier"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          {typeInfo && (
            <span className="text-2xl" aria-hidden="true">
              {typeInfo.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-serif text-base font-semibold text-[var(--justice)]">
              {typeInfo?.label ?? 'Nouveau dossier'}
            </p>
            {caseRow?.sub_type && (
              <p className="truncate text-xs text-[var(--text-muted)]">
                {caseRow.sub_type.replace(/_/g, ' ')}
              </p>
            )}
          </div>
        </div>

        {statusInfo && (
          <div className="mt-3">
            <Badge variant={statusInfo.variant} size="md">
              {statusInfo.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Success probability */}
      {caseRow?.success_probability != null && (
        <div className="rounded-xl border border-[var(--border)] bg-white/60 p-3">
          <Progress
            value={caseRow.success_probability}
            label="Probabilité de succès"
            showLabel
          />
        </div>
      )}

      {/* Money saved */}
      {caseRow && caseRow.money_saved > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600">
            Argent potentiellement économisé
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-700">
            {formatEuros(caseRow.money_saved)}
          </p>
        </div>
      )}

      {/* Deadlines */}
      {deadlines.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--gold-dark)]">
            Délais à respecter
          </p>
          <ul className="space-y-2">
            {deadlines.map((d, i) => {
              const days = daysUntil(d.date)
              const critical = d.critical || days <= 3
              return (
                <li
                  key={i}
                  className={cn(
                    'rounded-lg border p-2 text-xs',
                    critical
                      ? 'border-red-200 bg-red-50/80 text-red-800'
                      : 'border-[var(--border)] bg-white/60'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {formatDeadline(d.date)}
                    </span>
                    {critical && (
                      <span
                        className="text-[10px] font-bold uppercase text-red-600"
                        aria-label="Délai critique"
                      >
                        ⚠ critique
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[var(--text-secondary)]">
                    {d.description}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[var(--gold-dark)]">
          Actions rapides
        </p>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onActionClick('generate_document')}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--justice)]/30 hover:bg-white"
          >
            📄 Générer le document
          </button>
          <button
            type="button"
            onClick={() => onActionClick('sign')}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--justice)]/30 hover:bg-white"
          >
            ✍️ Signer
          </button>
          <button
            type="button"
            onClick={() => onActionClick('send_recommande')}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--justice)]/30 hover:bg-white"
          >
            📨 Envoyer en recommandé AR
          </button>
          {caseRow?.id && (
            <Link
              href={`/dossiers/${caseRow.id}`}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--justice)]/30 hover:bg-white"
            >
              📋 Voir le dossier complet
            </Link>
          )}
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-2 text-left text-xs font-semibold text-[var(--gold-dark)] transition-colors hover:bg-[var(--gold)]/20"
          >
            🔄 Nouveau dossier
          </Link>
        </div>
      </div>
    </aside>
  )
}
