'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'

interface CaseInfoCardProps {
  caseId: string
  caseSummary: string | null
}

export default function CaseInfoCard({ caseId, caseSummary }: CaseInfoCardProps) {
  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        Dossier associé
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-medium text-[var(--text-primary)]">
        {caseSummary ?? 'Dossier sans titre'}
      </p>
      <Link
        href={`/chat/${caseId}`}
        className="mt-2 inline-block text-xs font-semibold text-[var(--justice)] hover:underline"
      >
        Reprendre la conversation →
      </Link>
    </Card>
  )
}
