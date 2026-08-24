'use client'

import { formatRelativeDate } from '@/lib/case-helpers'
import Card from '@/components/ui/Card'

interface ScanHistoryItem {
  id: string
  case_id: string | null
  file_name: string
  detected_type: string | null
  signed_url: string | null
  created_at: string
}

interface ScanHistoryProps {
  history: ScanHistoryItem[]
  loading: boolean
}

export default function ScanHistory({ history, loading }: ScanHistoryProps) {
  if (loading) {
    return (
      <Card padding="md">
        <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card padding="md">
        <p className="text-sm text-[var(--text-muted)]">
          Aucun scan récent. Scanne ton premier document ci-dessus.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {history.map((s) => (
        <Card key={s.id} padding="md" className="group cursor-default">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--justice)]/10 text-xl">
              📄
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-[var(--text-primary)]">
                {s.file_name}
              </p>
              <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                {s.detected_type
                  ? s.detected_type.replace(/_/g, ' ')
                  : 'Type inconnu'}
                {' · '}
                {formatRelativeDate(s.created_at)}
              </p>
            </div>
            {s.signed_url && (
              <a
                href={s.signed_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-xs font-semibold text-[var(--justice)] hover:underline"
              >
                Voir →
              </a>
            )}
          </div>
        </Card>
      ))}
    </div>
  )
}
