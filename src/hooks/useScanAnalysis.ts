import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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

const STEPS = [
  'Lecture du document…',
  'Identification du type…',
  'Extraction des données…',
  'Analyse juridique en cours…',
]

export function useScanAnalysis() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null)

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
      const msg = err instanceof Error ? err.message : 'Analyse impossible.'
      toast.error(msg)
    } finally {
      setAnalyzing(false)
    }
  }, [file, context])

  const resetAll = useCallback(() => {
    setFile(null)
    setResult(null)
    setContext('')
  }, [])

  return {
    file,
    setFile,
    previewUrl,
    context,
    setContext,
    analyzing,
    stepIdx,
    currentStep: STEPS[stepIdx],
    result,
    analyze,
    resetAll,
  }
}
