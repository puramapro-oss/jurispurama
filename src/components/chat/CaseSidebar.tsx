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
import {
  FileText,
  PenTool,
  Send,
  ExternalLink,
  Plus,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'

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
        'flex w-full flex-col gap-4 rounded-2xl elev-subtle bg-white/80 p-5 backdrop-blur-xl lg:h-fit lg:sticky lg:top-6 lg:w-[320px] lg:shrink-0',
        className
      )}
      aria-label="Détails du dossier"
    >
      {/* Header */}
      <div>
        <p className="text-eyebrow mb-1.5">Dossier</p>
        <div className="flex items-start gap-3">
          {typeInfo && (
            <span className="text-2xl mt-0.5" aria-hidden="true">
              {typeInfo.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-serif text-[17px] font-semibold leading-tight text-[var(--justice)]">
              {typeInfo?.label ?? 'Nouveau dossier'}
            </p>
            {caseRow?.sub_type && (
              <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
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
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[var(--justice)]" strokeWidth={2.5} />
            <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--justice)]">
              Probabilité de succès
            </p>
          </div>
          <Progress value={caseRow.success_probability} />
          <p className="mt-1 text-right font-serif text-lg font-bold text-[var(--justice)] tabular">
            {caseRow.success_probability}%
          </p>
        </div>
      )}

      {/* Money saved */}
      {caseRow && caseRow.money_saved > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Argent potentiellement économisé
          </p>
          <p className="mt-1 font-serif text-2xl font-bold text-emerald-700 tabular">
            {formatEuros(caseRow.money_saved)}
          </p>
        </div>
      )}

      {/* Deadlines */}
      {deadlines.length > 0 && (
        <div>
          <p className="text-eyebrow mb-2">Délais à respecter</p>
          <ul className="space-y-2">
            {deadlines.map((d, i) => {
              const days = daysUntil(d.date)
              const critical = d.critical || days <= 3
              return (
                <li
                  key={i}
                  className={cn(
                    'rounded-lg border p-2.5 text-xs',
                    critical
                      ? 'border-red-200 bg-red-50/80 text-red-800'
                      : 'border-[var(--border)] bg-white/60'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold tabular">
                      {formatDeadline(d.date)}
                    </span>
                    {critical && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-red-600"
                        aria-label="Délai critique"
                      >
                        <AlertTriangle size={10} strokeWidth={2.5} />
                        Critique
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 leading-snug text-[var(--text-secondary)]">
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
        <p className="text-eyebrow mb-2">Actions rapides</p>
        <div className="flex flex-col gap-1.5">
          <ActionRow
            icon={<FileText size={14} strokeWidth={2} />}
            label="Générer le document"
            onClick={() => onActionClick('generate_document')}
          />
          <ActionRow
            icon={<PenTool size={14} strokeWidth={2} />}
            label="Signer électroniquement"
            onClick={() => onActionClick('sign')}
            highlight
          />
          <ActionRow
            icon={<Send size={14} strokeWidth={2} />}
            label="Envoyer en recommandé AR"
            onClick={() => onActionClick('send_recommande')}
            highlight
          />
          {caseRow?.id && (
            <Link
              href={`/dossiers/${caseRow.id}`}
              className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white/60 px-3 py-2 text-left text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--justice)]/30 hover:bg-white focus-ring"
            >
              <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
              Voir le dossier complet
            </Link>
          )}
          <Link
            href="/chat"
            className="flex items-center gap-2 rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/10 px-3 py-2 text-left text-xs font-semibold text-[var(--gold-dark)] transition-colors hover:bg-[var(--gold)]/20 focus-ring"
          >
            <Plus size={14} strokeWidth={2.4} aria-hidden="true" />
            Nouveau dossier
          </Link>
        </div>
      </div>
    </aside>
  )
}

function ActionRow({
  icon,
  label,
  onClick,
  highlight,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors focus-ring',
        highlight
          ? 'border-[var(--gold)]/30 bg-[var(--gold)]/10 text-[var(--gold-dark)] hover:bg-[var(--gold)]/20'
          : 'border-[var(--border)] bg-white/60 text-[var(--text-primary)] hover:border-[var(--justice)]/30 hover:bg-white'
      )}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  )
}
