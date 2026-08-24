'use client'

import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface OcrField {
  key: string
  value: string | number | null
}

interface OcrInsight {
  severity: 'info' | 'warning' | 'critical'
  message: string
  legal_basis?: string
}

interface OcrAction {
  action: string
  label: string
}

interface ScanResult {
  scan_id: string | null
  signed_url: string
  storage_path: string
  document_type: string
  summary: string
  extracted_text: string
  extracted_fields: Record<string, string | number | null>
  insights: OcrInsight[]
  recommended_actions: OcrAction[]
  deadlines: Array<{ date: string; description: string; critical: boolean }>
}

interface ScanResultsProps {
  result: ScanResult
  extractedFields: OcrField[]
  creatingCase: boolean
  onCreateCase: () => void
  onReset: () => void
}

export default function ScanResults({
  result,
  extractedFields,
  creatingCase,
  onCreateCase,
  onReset,
}: ScanResultsProps) {
  return (
    <>
      <Card padding="md" className="mb-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Type de document
            </p>
            <p className="mt-0.5 font-semibold text-[var(--justice)]">
              {result.document_type.replace(/_/g, ' ')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Nouveau scan
          </Button>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {result.summary}
        </p>
      </Card>

      {result.insights.length > 0 && (
        <Card padding="md" className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Points d&apos;attention juridique
          </p>
          <ul className="space-y-2">
            {result.insights.map((ins, i) => {
              const colors =
                ins.severity === 'critical'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : ins.severity === 'warning'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
              return (
                <li
                  key={i}
                  className={`rounded-lg border p-2.5 text-sm ${colors}`}
                >
                  <div className="mb-0.5 flex items-center gap-1.5">
                    <Badge
                      variant={
                        ins.severity === 'critical'
                          ? 'red'
                          : ins.severity === 'warning'
                            ? 'amber'
                            : 'blue'
                      }
                    >
                      {ins.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="leading-snug">{ins.message}</p>
                  {ins.legal_basis && (
                    <p className="mt-1 text-xs opacity-80">
                      Base légale : {ins.legal_basis}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {extractedFields.length > 0 && (
        <Card padding="md" className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Champs extraits ({extractedFields.length})
          </p>
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            {extractedFields.slice(0, 12).map((f) => (
              <div
                key={f.key}
                className="rounded-lg border border-[var(--border)] bg-white/60 p-2"
              >
                <dt className="text-xs font-medium text-[var(--text-muted)]">
                  {f.key.replace(/_/g, ' ')}
                </dt>
                <dd className="mt-0.5 font-semibold text-[var(--text-primary)]">
                  {f.value ?? '—'}
                </dd>
              </div>
            ))}
          </dl>
          {extractedFields.length > 12 && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              +{extractedFields.length - 12} autres champs
            </p>
          )}
        </Card>
      )}

      {result.deadlines.length > 0 && (
        <Card padding="md" className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Délais importants détectés
          </p>
          <ul className="space-y-2">
            {result.deadlines.map((d, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-white/60 p-2 text-sm"
              >
                <span className="text-lg">⏰</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)]">
                    {new Date(d.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {d.critical && (
                      <Badge variant="red" className="ml-2">
                        CRITIQUE
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {d.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.recommended_actions.length > 0 && (
        <Card padding="md" className="mb-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Actions recommandées
          </p>
          <ul className="space-y-2">
            {result.recommended_actions.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-white/60 p-2 text-sm"
              >
                <span className="text-lg">✓</span>
                <p className="flex-1 text-[var(--text-secondary)]">
                  {a.label}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card padding="md">
        <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          JurisIA peut t&apos;aider à agir sur ce document.
        </p>
        <Button
          variant="primary"
          size="lg"
          onClick={onCreateCase}
          loading={creatingCase}
          className="w-full"
        >
          Créer un dossier à partir de ce scan
        </Button>
      </Card>
    </>
  )
}
