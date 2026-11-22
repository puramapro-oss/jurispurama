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
  const [file, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [context, setContext] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)
  const [result, setResult] = useState<ScanResult | null>(null)
  const previewRef = useRef<string | null>(null)
  const analysisRef = useRef<AbortController | null>(null)

  const setFile = useCallback((nextFile: File | null) => {
    const nextPreview = nextFile?.type.startsWith('image/')
      ? URL.createObjectURL(nextFile)
      : null
    analysisRef.current?.abort()
    setAnalyzing(false)
    setResult(null)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = nextPreview
    setSelectedFile(nextFile)
    setPreviewUrl(nextPreview)
  }, [])

  useEffect(() => () => {
    analysisRef.current?.abort()
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  // Rotating step animation during analysis
  useEffect(() => {
    if (!analyzing) return
    const stepTimer = setInterval(() => {
      setStepIdx((i) => (i + 1) % STEPS.length)
    }, 1800)
    return () => {
      clearInterval(stepTimer)
    }
  }, [analyzing])

  const analyze = useCallback(async () => {
    if (!file) return
    analysisRef.current?.abort()
    const controller = new AbortController()
    analysisRef.current = controller
    setStepIdx(0)
    setAnalyzing(true)
    setResult(null)

    try {
      const form = new FormData()
      form.append('file', file)
      if (context.trim()) form.append('context', context.trim())

      const res = await fetch('/api/ocr', { method: 'POST', body: form, signal: controller.signal })
      if (controller.signal.aborted) return
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error ?? 'Analyse impossible.')
      }
      const data = (await res.json()) as ScanResult
      if (controller.signal.aborted) return
      setResult(data)
      toast.success('Document analysé avec succès.')
    } catch (err) {
      if (controller.signal.aborted) return
      const msg = err instanceof Error ? err.message : 'Analyse impossible.'
      toast.error(msg)
    } finally {
      if (!controller.signal.aborted) setAnalyzing(false)
    }
  }, [file, context])

  const resetAll = useCallback(() => {
    setFile(null)
    setResult(null)
    setContext('')
  }, [setFile])

  return {
    file,
    setFile,
    previewUrl,
    context,
    setContext,
    analyzing,
    stepIdx: analyzing ? stepIdx : 0,
    currentStep: STEPS[analyzing ? stepIdx : 0],
    result,
    analyze,
    resetAll,
  }
}
