import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { NextAction } from '@/components/chat/ActionButtons'
import type { DocumentTemplate } from '@/lib/pdf/types'
import type { JurisCase, JurisMessage } from '@/types'

interface JurisDocumentLite {
  id: string
  title: string
  signature_status: 'pending' | 'signed' | 'expired'
  sent_status: 'not_sent' | 'sent_email' | 'sent_recommande' | 'sent_teleservice'
  created_at: string
}

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  streaming?: boolean
  actions?: string[] | null
}

interface UseChatActionsProps {
  caseId: string | null
  documents: JurisDocumentLite[]
  setCaseRow: (c: JurisCase) => void
  setDocuments: (d: JurisDocumentLite[]) => void
  setMessages: (fn: (prev: UIMessage[]) => UIMessage[]) => void
  scrollToBottom: (smooth: boolean) => void
}

export function useChatActions({
  caseId,
  documents,
  setCaseRow,
  setDocuments,
  setMessages,
  scrollToBottom,
}: UseChatActionsProps) {
  const router = useRouter()

  const handleAction = useCallback(
    (action: NextAction, setDocModalOpen: (v: boolean) => void) => {
      if (action === 'generate_document') {
        setDocModalOpen(true)
        return
      }

      if (
        action === 'sign' ||
        action === 'send_email' ||
        action === 'send_recommande'
      ) {
        const target = documents.find(
          (d) => d.signature_status !== 'expired'
        )
        if (!target) {
          toast.info(
            'Génère d&apos;abord ton document. JurisIA va te guider.',
            { duration: 4000 }
          )
          setDocModalOpen(true)
          return
        }
        if (action === 'sign' && target.signature_status === 'signed') {
          toast.info('Ce document est déjà signé. Tu peux l&apos;envoyer.', {
            duration: 4000,
          })
        }
        router.push(
          `/documents/${target.id}${
            action === 'send_email'
              ? '#send-email'
              : action === 'send_recommande'
                ? '#send-recommande'
                : '#sign'
          }`
        )
        return
      }

      if (action === 'close') {
        if (!caseId) return
        void (async () => {
          try {
            const res = await fetch(`/api/cases/${caseId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'resolu' }),
            })
            if (!res.ok) throw new Error('Échec mise à jour')
            toast.success('Dossier clôturé. Bravo !')
            const fresh = await fetch(`/api/cases/${caseId}`, {
              cache: 'no-store',
            })
            if (fresh.ok) {
              const data = (await fresh.json()) as { case: JurisCase }
              setCaseRow(data.case)
            }
          } catch {
            toast.error('Impossible de clôturer le dossier.')
          }
        })()
      }
    },
    [caseId, documents, router, setCaseRow]
  )

  const handleScanFile = useCallback(
    async (file: File) => {
      if (!caseId) {
        toast.error('Envoie d&apos;abord un message pour créer le dossier.')
        return
      }
      try {
        const form = new FormData()
        form.append('file', file)
        form.append('caseId', caseId)
        const res = await fetch('/api/ocr', { method: 'POST', body: form })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(err?.error ?? 'Analyse impossible.')
        }
        toast.success(
          'Document analysé. Consulte la nouvelle réponse de JurisIA.'
        )
        const fresh = await fetch(`/api/cases/${caseId}`, {
          cache: 'no-store',
        })
        if (fresh.ok) {
          const data = (await fresh.json()) as {
            case: JurisCase
            messages: JurisMessage[]
            documents?: JurisDocumentLite[]
          }
          setCaseRow(data.case)
          setDocuments(data.documents ?? [])
          setMessages(() =>
            data.messages
              .filter((m) => m.role === 'user' || m.role === 'assistant')
              .map((m) => ({
                id: m.id,
                role: m.role as 'user' | 'assistant',
                content: m.content,
                createdAt: m.created_at,
              }))
          )
          requestAnimationFrame(() => scrollToBottom(true))
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Analyse impossible.'
        toast.error(msg)
      }
    },
    [caseId, scrollToBottom, setCaseRow, setDocuments, setMessages]
  )

  const handleGenerateDocument = useCallback(
    async (payload: {
      documentType: DocumentTemplate
      title: string
      instructions: string
    }) => {
      if (!caseId) {
        toast.error('Dossier introuvable.')
        return
      }
      try {
        const res = await fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId,
            documentType: payload.documentType,
            title: payload.title,
            instructions: payload.instructions || undefined,
          }),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string
          } | null
          throw new Error(err?.error ?? 'Génération impossible.')
        }
        const data = (await res.json()) as { documentId: string }
        toast.success('Document généré avec succès.')
        router.push(`/documents/${data.documentId}`)
        return data.documentId
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Génération impossible.'
        toast.error(msg)
        throw err
      }
    },
    [caseId, router]
  )

  return {
    handleAction,
    handleScanFile,
    handleGenerateDocument,
  }
}
