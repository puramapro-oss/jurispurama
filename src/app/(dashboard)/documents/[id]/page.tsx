'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import SignModal from '@/components/documents/SignModal'
import SendModal from '@/components/documents/SendModal'
import DocumentHeader from '@/components/documents/DocumentHeader'
import StatusBanners from '@/components/documents/StatusBanners'
import DocumentPreview from '@/components/documents/DocumentPreview'
import CaseInfoCard from '@/components/documents/CaseInfoCard'
import NextStepsCard from '@/components/documents/NextStepsCard'
import RegenerateCard from '@/components/documents/RegenerateCard'
import DeleteCard from '@/components/documents/DeleteCard'

interface DocumentRow {
  id: string
  case_id: string
  type: string
  title: string
  content: string | null
  generated_data: unknown
  pdf_url: string | null
  signed_pdf_url: string | null
  signature_status: 'pending' | 'signed' | 'expired'
  sent_status:
    | 'not_sent'
    | 'sent_email'
    | 'sent_recommande'
    | 'sent_teleservice'
  sent_at: string | null
  sent_to: string | null
  tracking_number: string | null
  ar_received_at: string | null
  created_at: string
}

interface CaseSummary {
  id: string
  summary: string | null
  type: string
  status: string
}

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [caseRow, setCaseRow] = useState<CaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenLoading, setRegenLoading] = useState(false)
  const [signOpen, setSignOpen] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)

  const refetch = useCallback(() => {
    fetch(`/api/documents/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load')
        return (await r.json()) as {
          document: DocumentRow
          case: CaseSummary
        }
      })
      .then((data) => {
        setDoc(data.document)
        setCaseRow(data.case)
      })
      .catch(() => {
        toast.error('Impossible de charger le document.')
      })
  }, [id])

  useEffect(() => {
    let active = true
    fetch(`/api/documents/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) {
            toast.error('Document introuvable.')
            router.replace('/documents')
            return null
          }
          throw new Error('load')
        }
        return (await r.json()) as {
          document: DocumentRow
          case: CaseSummary
        }
      })
      .then((data) => {
        if (!active || !data) return
        setDoc(data.document)
        setCaseRow(data.case)
      })
      .catch(() => {
        if (active) toast.error('Impossible de charger le document.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id, router])

  useEffect(() => {
    if (loading || !doc) return
    if (typeof window === 'undefined') return
    const hash = window.location.hash.replace('#', '')
    if (!hash) return
    if (hash === 'sign' && doc.signature_status !== 'signed') {
      setSignOpen(true)
    } else if (hash === 'send-email' || hash === 'send-recommande') {
      setSendOpen(true)
    }
    window.history.replaceState(null, '', window.location.pathname)
  }, [loading, doc])

  const handleDelete = useCallback(async () => {
    if (!doc) return
    if (
      !confirm(
        'Supprimer ce document ? Cette action est irréversible.'
      )
    )
      return
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete')
      toast.success('Document supprimé.')
      router.push('/documents')
    } catch {
      toast.error('Impossible de supprimer ce document.')
    }
  }, [doc, router])

  const handleRegenerate = useCallback(
    async (instructions: string) => {
      if (!doc || !caseRow) return
      if (!instructions.trim()) {
        toast.error('Ajoute tes précisions avant de régénérer.')
        return
      }
      setRegenLoading(true)
      try {
        const res = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: caseRow.id,
            documentType: doc.type,
            title: doc.title,
            instructions: instructions.trim(),
          }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(err?.error ?? 'Régénération impossible.')
        }
        const data = (await res.json()) as { documentId: string }
        toast.success('Nouveau document généré.')
        router.push(`/documents/${data.documentId}`)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Régénération impossible.'
        toast.error(msg)
      } finally {
        setRegenLoading(false)
      }
    },
    [doc, caseRow, router]
  )

  if (loading) {
    return (
      <div className="container-narrow py-10">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/60" />
        <div className="mt-5 h-[60vh] animate-pulse rounded-2xl bg-white/60" />
      </div>
    )
  }

  if (!doc || !caseRow) return null

  const previewUrl = doc.signed_pdf_url ?? doc.pdf_url
  const isSigned = doc.signature_status === 'signed'

  return (
    <div className="container-narrow py-8 md:py-10">
      <DocumentHeader doc={doc} caseId={caseRow.id} />

      <StatusBanners
        isSigned={isSigned}
        sentStatus={doc.sent_status}
        trackingNumber={doc.tracking_number}
        sentTo={doc.sent_to}
        arReceivedAt={doc.ar_received_at}
      />

      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        <DocumentPreview previewUrl={previewUrl} title={doc.title} />

        <div className="space-y-4">
          <CaseInfoCard
            caseId={caseRow.id}
            caseSummary={caseRow.summary}
          />
          <NextStepsCard
            isSigned={isSigned}
            sentStatus={doc.sent_status}
            onSignClick={() => setSignOpen(true)}
            onSendClick={() => setSendOpen(true)}
          />
          <RegenerateCard
            onRegenerate={handleRegenerate}
            loading={regenLoading}
          />
          <DeleteCard onDelete={handleDelete} />
        </div>
      </div>

      <SignModal
        documentId={doc.id}
        documentTitle={doc.title}
        open={signOpen}
        onClose={() => setSignOpen(false)}
        onSigned={() => refetch()}
      />
      <SendModal
        documentId={doc.id}
        documentTitle={doc.title}
        caseType={caseRow.type}
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSent={() => refetch()}
      />
    </div>
  )
}
