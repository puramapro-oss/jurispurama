'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import MessageBubble from '@/components/chat/MessageBubble'
import ChatInput from '@/components/chat/ChatInput'
import CaseSidebar from '@/components/chat/CaseSidebar'
import PhaseStepper from '@/components/chat/PhaseStepper'
import ActionButtons, {
  type NextAction,
} from '@/components/chat/ActionButtons'
import GenerateDocumentModal from '@/components/chat/GenerateDocumentModal'
import type { CaseSidebarAction } from '@/components/chat/CaseSidebar'
import type { JurisCase, JurisMessage } from '@/types'
import type { DocumentTemplate } from '@/lib/pdf/types'

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

export default function ChatCasePage() {
  const router = useRouter()
  const params = useParams<{ caseId: string }>()
  const initialCaseId = params.caseId

  const [caseId, setCaseId] = useState<string | null>(
    initialCaseId === 'new' ? null : initialCaseId
  )
  const [caseRow, setCaseRow] = useState<JurisCase | null>(null)
  const [documents, setDocuments] = useState<JurisDocumentLite[]>([])
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [loading, setLoading] = useState(initialCaseId !== 'new')
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [errored, setErrored] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const pendingSentRef = useRef(false)

  // Scroll helpers
  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 120
    autoScrollRef.current = nearBottom
  }, [])

  useEffect(() => {
    if (autoScrollRef.current) scrollToBottom(true)
  }, [messages, scrollToBottom])

  // Load case on mount (unless "new")
  useEffect(() => {
    if (initialCaseId === 'new') {
      setLoading(false)
      return
    }
    let active = true
    fetch(`/api/cases/${initialCaseId}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) {
            toast.error('Dossier introuvable.')
            router.replace('/chat')
            return null
          }
          throw new Error('Impossible de charger le dossier')
        }
        return r.json() as Promise<{
          case: JurisCase
          messages: JurisMessage[]
          documents?: JurisDocumentLite[]
        }>
      })
      .then((data) => {
        if (!active || !data) return
        setCaseRow(data.case)
        setDocuments(data.documents ?? [])
        setMessages(
          data.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
              createdAt: m.created_at,
            }))
        )
        requestAnimationFrame(() => scrollToBottom(false))
      })
      .catch(() => {
        if (active) toast.error('Impossible de charger le dossier.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [initialCaseId, router, scrollToBottom])

  // Send a message (streamed)
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return
      setErrored(null)
      setStreaming(true)
      autoScrollRef.current = true

      const tempUserId = `temp-user-${Date.now()}`
      const tempAssistantId = `temp-assistant-${Date.now()}`

      setMessages((prev) => [
        ...prev,
        {
          id: tempUserId,
          role: 'user',
          content: text,
          createdAt: new Date().toISOString(),
        },
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          streaming: true,
        },
      ])

      let assistantText = ''
      let finalCaseId = caseId

      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            caseId: caseId ?? undefined,
            message: text,
          }),
        })

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({
            error: 'JurisIA est indisponible pour le moment.',
          }))
          throw new Error(
            err.error ?? `Erreur ${res.status}. Réessaie dans un instant.`
          )
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data:')) continue
            const payload = line.slice(5).trim()
            if (payload === '[DONE]') continue
            if (!payload) continue
            try {
              const evt = JSON.parse(payload) as {
                type: 'text' | 'case_created' | 'done' | 'error'
                content?: string
                caseId?: string
                meta?: {
                  next_actions?: string[] | null
                } | null
                error?: string
              }
              if (evt.type === 'case_created' && evt.caseId) {
                finalCaseId = evt.caseId
                setCaseId(evt.caseId)
              } else if (evt.type === 'text' && evt.content) {
                assistantText += evt.content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantId
                      ? { ...m, content: assistantText }
                      : m
                  )
                )
              } else if (evt.type === 'done') {
                if (evt.caseId) finalCaseId = evt.caseId
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempAssistantId
                      ? {
                          ...m,
                          streaming: false,
                          createdAt: new Date().toISOString(),
                          actions: evt.meta?.next_actions ?? null,
                        }
                      : m
                  )
                )
              } else if (evt.type === 'error' && evt.error) {
                throw new Error(evt.error)
              }
            } catch (parseErr) {
              if (parseErr instanceof Error && parseErr.message) {
                throw parseErr
              }
            }
          }
        }

        // Refetch case row for fresh sidebar data
        if (finalCaseId) {
          const freshRes = await fetch(`/api/cases/${finalCaseId}`, {
            cache: 'no-store',
          })
          if (freshRes.ok) {
            const fresh = (await freshRes.json()) as {
              case: JurisCase
              documents?: JurisDocumentLite[]
            }
            setCaseRow(fresh.case)
            setDocuments(fresh.documents ?? [])
          }
          if (initialCaseId === 'new') {
            window.history.replaceState(null, '', `/chat/${finalCaseId}`)
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'JurisIA est indisponible pour le moment.'
        setErrored(msg)
        toast.error(msg)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAssistantId
              ? {
                  ...m,
                  content:
                    m.content ||
                    `⚠️ ${msg}`,
                  streaming: false,
                }
              : m
          )
        )
      } finally {
        setStreaming(false)
      }
    },
    [caseId, initialCaseId, streaming]
  )

  // Auto-send pending message from /chat page (new dossier)
  useEffect(() => {
    if (initialCaseId !== 'new') return
    if (pendingSentRef.current) return
    try {
      const raw = sessionStorage.getItem('jurispurama:pending_message')
      if (!raw) return
      sessionStorage.removeItem('jurispurama:pending_message')
      const parsed = JSON.parse(raw) as { message: string; ts: number }
      if (!parsed?.message) return
      pendingSentRef.current = true
      void sendMessage(parsed.message)
    } catch {
      // noop
    }
  }, [initialCaseId, sendMessage])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    void sendMessage(text)
  }

  const handleAction = useCallback(
    (action: NextAction) => {
      if (action === 'generate_document') {
        setDocModalOpen(true)
        return
      }

      // Sign / send_email / send_recommande → on route vers le doc le plus récent
      // qui contient l'UI de signature canvas + envoi (vrais endpoints API).
      // Si aucun doc n'existe, on ouvre le modal de génération avec un message.
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
            'Génère d\'abord ton document. JurisIA va te guider.',
            { duration: 4000 }
          )
          setDocModalOpen(true)
          return
        }
        // Pour signer : doc doit être pending. Pour envoyer : peu importe (signed
        // recommandé, mais l'API accepte aussi unsigned avec warning).
        if (action === 'sign' && target.signature_status === 'signed') {
          toast.info('Ce document est déjà signé. Tu peux l\'envoyer.', {
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
            // Refresh case
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
        return
      }
    },
    [caseId, documents, router]
  )

  const handleSidebarAction = useCallback(
    (action: CaseSidebarAction) => {
      if (action === 'view_full' || action === 'new_case') return
      handleAction(action as NextAction)
    },
    [handleAction]
  )

  const handleScanFile = useCallback(
    async (file: File) => {
      if (!caseId) {
        toast.error('Envoie d\'abord un message pour créer le dossier.')
        return
      }
      setScanning(true)
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
        toast.success('Document analysé. Consulte la nouvelle réponse de JurisIA.')
        // Refresh messages
        const fresh = await fetch(`/api/cases/${caseId}`, { cache: 'no-store' })
        if (fresh.ok) {
          const data = (await fresh.json()) as {
            case: JurisCase
            messages: JurisMessage[]
            documents?: JurisDocumentLite[]
          }
          setCaseRow(data.case)
          setDocuments(data.documents ?? [])
          setMessages(
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
      } finally {
        setScanning(false)
      }
    },
    [caseId, scrollToBottom]
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
      setGenerating(true)
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
        setDocModalOpen(false)
        router.push(`/documents/${data.documentId}`)
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Génération impossible.'
        toast.error(msg)
      } finally {
        setGenerating(false)
      }
    },
    [caseId, router]
  )

  const currentStatus = caseRow?.status ?? 'diagnostic'

  const emptyStateShown =
    !loading && messages.length === 0 && initialCaseId !== 'new'

  const showWelcome =
    initialCaseId === 'new' && messages.length === 0 && !streaming

  const hasMessages = messages.length > 0

  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && !messages[i].streaming) return i
    }
    return -1
  }, [messages])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:py-6 lg:flex-row lg:h-[calc(100dvh-3rem)] h-[calc(100dvh-3.5rem-5.5rem)] lg:py-4">
      {/* Main chat column */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Phase stepper */}
        <PhaseStepper current={currentStatus} className="mb-3" />

        {/* Messages scroll area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 space-y-4 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white/40 p-4 backdrop-blur"
        >
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
              Chargement du dossier…
            </div>
          )}

          {showWelcome && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-3xl text-white shadow-lg">
                ⚖️
              </div>
              <h2 className="mb-2 font-serif text-2xl font-semibold text-[var(--justice)]">
                Bonjour, je suis JurisIA
              </h2>
              <p className="max-w-md text-sm text-[var(--text-secondary)]">
                Raconte-moi ta situation dans le champ ci-dessous. Je t&apos;aide à
                comprendre tes droits et je construis ton dossier pas à pas.
              </p>
            </div>
          )}

          {emptyStateShown && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Ce dossier est vide. Pose ta première question à JurisIA
                ci-dessous.
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              createdAt={m.createdAt}
              streaming={m.streaming}
            >
              {idx === lastAssistantIdx && m.role === 'assistant' && (
                <ActionButtons
                  actions={m.actions}
                  onAction={handleAction}
                />
              )}
            </MessageBubble>
          ))}

          {errored && !streaming && hasMessages && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              ⚠️ {errored}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="mt-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={streaming}
            placeholder={
              hasMessages
                ? 'Pose ta question suivante…'
                : 'Raconte ton problème juridique à JurisIA…'
            }
            onScan={caseId ? handleScanFile : undefined}
            scanning={scanning}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>
              🔒 Confidentiel · protégé par le secret juridique numérique
            </span>
            {caseRow?.id && (
              <Link
                href={`/dossiers/${caseRow.id}`}
                className="font-semibold text-[var(--justice)] hover:underline"
              >
                Voir le dossier →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <CaseSidebar caseRow={caseRow} onActionClick={handleSidebarAction} />

      {/* Generate document modal */}
      <GenerateDocumentModal
        open={docModalOpen}
        caseType={caseRow?.type ?? 'administratif'}
        defaultTitle={
          caseRow?.summary
            ? caseRow.summary.slice(0, 60)
            : undefined
        }
        onClose={() => setDocModalOpen(false)}
        onGenerate={handleGenerateDocument}
        loading={generating}
      />
    </div>
  )
}
