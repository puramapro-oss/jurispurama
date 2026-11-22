export interface ChatStreamEvent {
  type: 'text' | 'case_created' | 'done' | 'error'
  content?: string
  caseId?: string
  meta?: { next_actions?: string[] | null } | null
  error?: string
}

/** Read the existing SSE protocol and release its reader on completion or cancellation. */
export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onEvent: (event: ChatStreamEvent) => void,
) {
  const reader = body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = false
  let cancelled = false
  const cancel = () => {
    if (cancelled) return
    cancelled = true
    // Cancellation is cleanup; a transport cancellation failure is not a new UI error.
    void reader.cancel().catch(() => undefined)
  }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    signal.throwIfAborted()
    while (true) {
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) {
        finished = true
        throw new Error('La réponse a été interrompue. Tu peux réessayer.')
      }
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        signal.throwIfAborted()
        const line = part.trim()
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload || payload === '[DONE]') continue
        const event = JSON.parse(payload) as ChatStreamEvent
        onEvent(event)
        signal.throwIfAborted()
        // The route sends `done` after its work, then a redundant [DONE] marker.
        // A transport EOF on its own does not confirm that the response completed.
        if (event.type === 'done') return
      }
    }
  } finally {
    signal.removeEventListener('abort', cancel)
    if (!finished) cancel()
    reader.releaseLock()
  }
}
