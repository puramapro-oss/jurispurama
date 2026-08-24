'use client'

import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import type { JurisCase } from '@/types'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  formatRelativeDate,
} from '@/lib/case-helpers'
import { formatDate } from '@/lib/utils'

interface CaseHeaderProps {
  caseRow: JurisCase
  deleting: boolean
  onArchive: () => void
}

export default function CaseHeader({
  caseRow,
  deleting,
  onArchive,
}: CaseHeaderProps) {
  const typeInfo = CASE_TYPE_LABELS[caseRow.type]
  const statusInfo = CASE_STATUS_LABELS[caseRow.status]

  return (
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
            onClick={onArchive}
            loading={deleting}
          >
            Archiver
          </Button>
        </div>
      </div>
    </header>
  )
}
