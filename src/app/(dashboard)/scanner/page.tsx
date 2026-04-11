'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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

interface ScanHistoryItem {
  id: string
  case_id: string | null
  file_name: string
  detected_type: string | null
  signed_url: string | null
  created_at: string
}

const STEPS = [
  'Lecture du document…',
  'Identification du type…',
  'Extraction des données…',
  'Analyse juridique en cours…',
]

export default function ScannerPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [creatingCase, setCreatingCase] = useState(false)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load history
  useEffect(() => {
    let active = true
    fetch('/api/ocr', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { scans: [] }))
      .then((d: { scans?: ScanHistoryItem[] }) => {
        if (active) setHistory(d.scans ?? [])
      })
      .finally(() => active && setHistoryLoading(false))
    return () => {
      active = false
    }
  }, [result])

  // Preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
  }, [file])

  // Rotating step animation during analysis
  useEffect(() => {
    if (!analyzing) {
      if (stepTimer.current) clearInterval(stepTimer.current)
      setStepIdx(0)
      return
    }
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length)
    }, 1800)
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current)
    }
  }, [analyzing])

  const handleFile = useCallback((f: File | null) => {
    if (!f) return
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ]
    if (!allowed.includes(f.type)) {
      toast.error('Format non supporté. Utilise JPEG, PNG, WEBP, GIF ou PDF.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 Mo).')
      return
    }
    setFile(f)
    setResult(null)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragActive(false)
      const f = e.dataTransfer.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const onDragLeave = useCallback(() => setDragActive(false), [])

  const onFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      handleFile(e.target.files?.[0] ?? null)
    },
    [handleFile]
  )

  const analyze = useCallback(async () => {
    if (!file) return
    setAnalyzing(true)
    setResult(null)

    try {
      const form = new FormData()
      form.append('file', file)
      if (context.trim()) form.append('context', context.trim())

      const res = await fetch('/api/ocr', { method: 'POST', body: form })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error ?? 'Analyse impossible.')
      }
      const data = (await res.json()) as ScanResult
      setResult(data)
      toast.success('Document analysé avec succès.')
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Analyse impossible.'
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }, [file, context])

  const createCaseFromScan = useCallback(async () => {
    if (!result) return
    setCreatingCase(true)
    try {
      const message = `J'ai scanné un document : **${result.document_type.replace(/_/g, ' ')}**

${result.summary}

**Champs extraits :**
${Object.entries(result.extracted_fields)
  .slice(0, 12)
  .map(([k, v]) => `- ${k.replace(/_/g, ' ')} : ${v ?? '—'}`)
  .join('\n')}

**Points d'attention :**
${
  result.insights
    .map((i) => `- ${i.severity.toUpperCase()} — ${i.message}`)
    .join('\n') || '(aucun)'
}

Peux-tu m'aider à agir sur ce document ? Quelle est la meilleure stratégie ?`

      // Stash message then redirect to /chat/new — chat page consumes it
      sessionStorage.setItem(
        'jurispurama:pending_message',
        JSON.stringify({ message, ts: Date.now() })
      )
      router.push('/chat/new')
    } catch {
      toast.error('Impossible de créer le dossier.')
    } finally {
      setCreatingCase(false)
    }
  }, [result, router])

  const resetAll = useCallback(() => {
    setFile(null)
    setResult(null)
    setContext('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const extractedFields: OcrField[] = result
    ? Object.entries(result.extracted_fields).map(([k, v]) => ({
        key: k,
        value: v,
      }))
    : []

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Scanner OCR juridique
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Scanne un document
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          PV, contrat, courrier administratif, facture… JurisIA extrait les
          données, identifie les failles légales et te propose un plan d&apos;action.
        </p>
      </header>

      {!result && (
        <Card padding="lg" className="mb-6">
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            className={`relative flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
              dragActive
                ? 'border-[var(--justice)] bg-[var(--justice)]/5'
                : 'border-[var(--border-strong)] bg-white/30'
            }`}
          >
            {file ? (
              <div className="flex w-full flex-col items-center gap-4">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-h-64 rounded-xl border border-[var(--border)] object-contain shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--justice)]/10 text-4xl">
                    📄
                  </div>
                )}
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {(file.size / 1024).toFixed(1)} Ko · {file.type}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                  >
                    Changer de fichier
                  </Button>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={analyze}
                    loading={analyzing}
                  >
                    Analyser avec JurisIA
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetAll}
                    disabled={analyzing}
                  >
                    Retirer
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 text-5xl" aria-hidden="true">
                  📷
                </div>
                <h2 className="mb-2 font-serif text-xl font-semibold text-[var(--justice)]">
                  Dépose ton document ici
                </h2>
                <p className="mb-4 max-w-md text-sm text-[var(--text-secondary)]">
                  JPEG, PNG, WEBP ou PDF — 10 Mo max. Prends une photo avec
                  ton téléphone, elle sera analysée en quelques secondes.
                </p>
                <div className="flex flex-col items-center gap-2 sm:flex-row">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Choisir un fichier
                  </Button>
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[var(--border-strong)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--justice)] transition-all hover:border-[var(--justice)]">
                    📸 Prendre une photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={onFileInput}
                    />
                  </label>
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="sr-only"
              onChange={onFileInput}
            />
          </div>

          {file && !analyzing && (
            <div className="mt-5">
              <label
                htmlFor="context"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
              >
                Contexte (optionnel)
              </label>
              <textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Ex : c'est un PV pour excès de vitesse reçu hier, je conteste car je n'étais pas au volant…"
                rows={3}
                className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
              />
            </div>
          )}

          {analyzing && (
            <div className="mt-5 flex items-center gap-3 rounded-xl border border-[var(--justice)]/20 bg-[var(--justice)]/5 px-4 py-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-[var(--justice)]" />
              <p className="text-sm font-medium text-[var(--justice)]">
                {STEPS[stepIdx]}
              </p>
            </div>
          )}
        </Card>
      )}

      {result && (
        <div className="mb-6 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          {/* Left: preview */}
          <Card padding="md">
            <p className="mb-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Aperçu
            </p>
            {result.signed_url.endsWith('.pdf') ||
            result.signed_url.includes('.pdf?') ? (
              <iframe
                src={result.signed_url}
                className="h-[480px] w-full rounded-xl border border-[var(--border)]"
                title="Preview PDF"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.signed_url}
                alt="Document scanné"
                className="max-h-[480px] w-full rounded-xl border border-[var(--border)] object-contain"
              />
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <Badge variant="blue" size="sm">
                {result.document_type.replace(/_/g, ' ')}
              </Badge>
              <button
                type="button"
                onClick={resetAll}
                className="text-[var(--text-muted)] hover:text-[var(--justice)]"
              >
                Scanner un autre document
              </button>
            </div>
          </Card>

          {/* Right: analysis */}
          <div className="space-y-4">
            <Card padding="md">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Résumé JurisIA
              </p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {result.summary}
              </p>
            </Card>

            {extractedFields.length > 0 && (
              <Card padding="md">
                <p className="mb-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Champs extraits
                </p>
                <dl className="grid gap-2 text-sm">
                  {extractedFields.map((f) => (
                    <div
                      key={f.key}
                      className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-1.5 last:border-0"
                    >
                      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                        {f.key.replace(/_/g, ' ')}
                      </dt>
                      <dd className="max-w-[60%] text-right font-medium text-[var(--text-primary)]">
                        {f.value ?? '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {result.insights.length > 0 && (
              <Card padding="md">
                <p className="mb-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Points d&apos;attention
                </p>
                <ul className="space-y-2">
                  {result.insights.map((i, idx) => (
                    <li
                      key={idx}
                      className={`rounded-xl border px-3 py-2 text-sm ${
                        i.severity === 'critical'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : i.severity === 'warning'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-blue-200 bg-blue-50 text-blue-800'
                      }`}
                    >
                      <p className="font-medium">{i.message}</p>
                      {i.legal_basis && (
                        <p className="mt-1 text-xs font-mono opacity-80">
                          {i.legal_basis}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <div className="flex flex-col gap-2">
              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={createCaseFromScan}
                loading={creatingCase}
              >
                📁 Créer un dossier à partir de ce document
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <section>
        <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
          Historique des scans
        </h2>
        {historyLoading ? (
          <div className="grid gap-3 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-2xl bg-white/60"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          <Card padding="md" className="text-center text-sm text-[var(--text-muted)]">
            Aucun scan pour l&apos;instant. Ton historique apparaîtra ici.
          </Card>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {history.map((h) => (
              <li key={h.id}>
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white/70 p-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--justice)]/10 text-xl">
                    📄
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {h.file_name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {h.detected_type?.replace(/_/g, ' ') ?? 'non identifié'}{' '}
                      ·{' '}
                      {new Date(h.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {h.signed_url && (
                    <a
                      href={h.signed_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[var(--justice)] hover:underline"
                    >
                      Voir
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
