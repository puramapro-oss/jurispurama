import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Progress from '@/components/ui/Progress'
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  formatRelativeDate,
} from '@/lib/case-helpers'
import type { JurisCase } from '@/types'

interface CaseCardProps {
  case: JurisCase
}

export default function CaseCard({ case: c }: CaseCardProps) {
  const typeInfo = CASE_TYPE_LABELS[c.type]
  const statusInfo = CASE_STATUS_LABELS[c.status]

  return (
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
  )
}
