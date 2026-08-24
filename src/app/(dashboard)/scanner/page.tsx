'use client'

import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import UploadZone from '@/components/scanner/UploadZone'
import ScanResults from '@/components/scanner/ScanResults'
import ScanHistory from '@/components/scanner/ScanHistory'
import { useScanAnalysis } from '@/hooks/useScanAnalysis'

interface ScanHistoryItem {
  id: string
  case_id: string | null
  file_name: string
  detected_type: string | null
  signed_url: string | null
  created_at: string
}

export default function ScannerPage() {
  const router = useRouter()
  const {
    file,
    setFile,
    previewUrl,
    context,
    setContext,
    analyzing,
    currentStep,
    result,
    analyze,
    resetAll,
  } = useScanAnalysis()

  const [creatingCase, setCreatingCase] = useState(false)
  const [history, setHistory] = useState<ScanHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)

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

  const handleFile = useCallback(
    (f: File | null) => {
      if (!f) return
      const allowed = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'application/pdf',
      ]
      if (!allowed.includes(f.type)) {
        toast.error(
          'Format non supporté. Utilise JPEG, PNG, WEBP, GIF ou PDF.'
        )
        return
      }
      if (f.size > 10 * 1024 * 1024) {
        toast.error('Fichier trop volumineux (max 10 Mo).')
        return
      }
      setFile(f)
    },
    [setFile]
  )

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

  const extractedFields = result
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
          données, identifie les failles légales et te propose un plan
          d&apos;action.
        </p>
      </header>

      {!result && (
        <Card padding="lg" className="mb-6">
          <UploadZone
            file={file}
            previewUrl={previewUrl}
            dragActive={dragActive}
            analyzing={analyzing}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onFileInput={onFileInput}
            onAnalyze={analyze}
            onReset={resetAll}
            context={context}
            setContext={setContext}
          />
        </Card>
      )}

      {analyzing && (
        <Card padding="md" className="mb-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--justice)] border-t-transparent" />
            <p className="font-medium text-[var(--text-primary)]">
              {currentStep}
            </p>
          </div>
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-[var(--justice)] to-[var(--gold-dark)] transition-all duration-700"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            JurisIA analyse ton document avec Claude Sonnet 4. Cela peut
            prendre 10 à 20 secondes.
          </p>
        </Card>
      )}

      {result && (
        <ScanResults
          result={result}
          extractedFields={extractedFields}
          creatingCase={creatingCase}
          onCreateCase={createCaseFromScan}
          onReset={resetAll}
        />
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
            Scans récents
          </h2>
          <Badge variant="gray">{history.length}</Badge>
        </div>
        <ScanHistory history={history} loading={historyLoading} />
      </section>
    </div>
  )
}
