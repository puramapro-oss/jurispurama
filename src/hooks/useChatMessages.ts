import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { readChatStream } from '@/lib/chat-stream'
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

export function useChatMessages(
  initialCaseId: string,
  scrollToBottom: (smooth: boolean) => void
) {
  const [sourceId, setSourceId] = useState(initialCaseId)
  const [caseId, setCaseId] = useState<string | null>(
    initialCaseId === 'new' ? null : initialCaseId
  )
  const [caseRow, setCaseRow] = useState<JurisCase | null>(null)
  const [documents, setDocuments] = useState<JurisDocumentLite[]>([])
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [loading, setLoading] = useState(initialCaseId !== 'new')
  const [streaming, setStreaming] = useState(false)
  const [errored, setErrored] = useState<string | null>(null)
  const [conversationVersion, setConversationVersion] = useState(0)

  const scopeRef = useRef<AbortController | null>(null)
  const streamRef = useRef<AbortController | null>(null)
  const messageSequence = useRef(0)
  const loadedCaseRef = useRef<string | null>(null)

  if (sourceId !== initialCaseId) {
    setSourceId(initialCaseId)
    // Adopting the ID just created by this stream keeps the same conversation.
    if (initialCaseId !== caseId) {
      setConversationVersion(version => version + 1)
      setCaseId(initialCaseId === 'new' ? null : initialCaseId)
      setCaseRow(null)
      setDocuments([])
      setMessages([])
      setLoading(initialCaseId !== 'new')
      setStreaming(false)
      setErrored(null)
    }
  }

  useEffect(() => {
    loadedCaseRef.current = null
    const scope = new AbortController()
    scopeRef.current = scope
    return () => {
      scope.abort()
      if (scopeRef.current === scope) scopeRef.current = null
    }
  }, [conversationVersion])

  // Load on mount or after a streamed case's final refresh fails.
  useEffect(() => {
    const readCaseId = initialCaseId === 'new' ? caseId : initialCaseId
    if (!readCaseId || streaming || loadedCaseRef.current === readCaseId) return
    loadedCaseRef.current = null
    const controller = new AbortController()
    let frame: number | undefined
    fetch(`/api/cases/${readCaseId}`, { cache: 'no-store', signal: controller.signal })
      .then(async (r) => {
        if (controller.signal.aborted) return null
        if (!r.ok) {
          if (r.status === 404) {
            toast.error('Dossier introuvable.')
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
        if (controller.signal.aborted || !data) return
        loadedCaseRef.current = data.case.id
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
        frame = requestAnimationFrame(() => {
          if (!controller.signal.aborted) scrollToBottom(false)
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) toast.error('Impossible de charger le dossier.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
      if (frame !== undefined) cancelAnimationFrame(frame)
    }
  }, [initialCaseId, caseId, scrollToBottom, streaming])

  const sendMessage = useCallback(
    async (text: string) => {
      const scope = scopeRef.current
      if (typeof text !== 'string' || !text.trim() || loading || streamRef.current || !scope || scope.signal.aborted) return
      const controller = new AbortController()
      streamRef.current = controller
      const current = () => !controller.signal.aborted &&
        scopeRef.current === scope && streamRef.current === controller
      const cancel = () => {
        controller.abort()
        if (streamRef.current === controller) streamRef.current = null
      }
      scope.signal.addEventListener('abort', cancel, { once: true })
      const initialPath = window.location.pathname
      setErrored(null)
      setStreaming(true)

      const sequence = `${Date.now()}-${messageSequence.current++}`
      const tempUserId = `temp-user-${sequence}`
      const tempAssistantId = `temp-assistant-${sequence}`

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
          signal: controller.signal,
          body: JSON.stringify({
            caseId: caseId ?? undefined,
            message: text,
          }),
        })
        if (!current()) {
          void res.body?.cancel().catch(() => undefined)
          return
        }

        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({
            error: 'JurisIA est indisponible pour le moment.',
          }))
          throw new Error(
            err.error ?? `Erreur ${res.status}. Réessaie dans un instant.`
          )
        }

        await readChatStream(res.body, controller.signal, (evt) => {
          if (!current()) return
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
        })
        if (!current()) return

        // Refetch case row
        if (finalCaseId) {
          const freshRes = await fetch(`/api/cases/${finalCaseId}`, {
            cache: 'no-store',
            signal: controller.signal,
          })
          if (!current()) return
          if (freshRes.ok) {
            const fresh = (await freshRes.json()) as {
              case: JurisCase
              documents?: JurisDocumentLite[]
            }
            if (!current()) return
            loadedCaseRef.current = fresh.case.id
            setCaseRow(fresh.case)
            setDocuments(fresh.documents ?? [])
          }
          if (initialCaseId === 'new' && window.location.pathname === initialPath) {
            window.history.replaceState(window.history.state, '', `/chat/${finalCaseId}`)
          }
        }
      } catch (err) {
        if (!current()) return
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
                  content: m.content || `⚠️ ${msg}`,
                  streaming: false,
                }
              : m
          )
        )
      } finally {
        scope.signal.removeEventListener('abort', cancel)
        if (current()) setStreaming(false)
        if (streamRef.current === controller) streamRef.current = null
      }
    },
    [caseId, initialCaseId, loading]
  )

  return {
    caseId,
    setCaseId,
    caseRow,
    setCaseRow,
    documents,
    setDocuments,
    messages,
    setMessages,
    loading,
    streaming,
    errored,
    sendMessage,
  }
}
