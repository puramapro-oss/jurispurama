import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
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
  const [caseId, setCaseId] = useState<string | null>(
    initialCaseId === 'new' ? null : initialCaseId
  )
  const [caseRow, setCaseRow] = useState<JurisCase | null>(null)
  const [documents, setDocuments] = useState<JurisDocumentLite[]>([])
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [loading, setLoading] = useState(initialCaseId !== 'new')
  const [streaming, setStreaming] = useState(false)
  const [errored, setErrored] = useState<string | null>(null)

  const autoScrollRef = useRef(true)

  // Load case on mount
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
  }, [initialCaseId, scrollToBottom])

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

        // Refetch case row
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
                  content: m.content || `⚠️ ${msg}`,
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
