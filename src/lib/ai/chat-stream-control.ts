import { sseEncode } from './chat-constants'

/** One lifecycle for the HTTP stream, provider work and bounded server deadline. */
export function createChatStreamControl(
  controller: ReadableStreamDefaultController<Uint8Array>,
  requestSignal: AbortSignal,
  remainingMs: number,
) {
  const work = new AbortController()
  const encoder = new TextEncoder()
  let closed = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const dispose = () => {
    requestSignal.removeEventListener('abort', abortRequest)
    if (timer !== undefined) clearTimeout(timer)
  }
  const close = () => {
    if (!closed) { closed = true; controller.close() }
    dispose()
  }
  const write = (frame: string) => {
    work.signal.throwIfAborted()
    if (closed) throw new DOMException('Response closed', 'AbortError')
    controller.enqueue(encoder.encode(frame))
  }
  const error = (message: string) => {
    if (closed) return
    controller.enqueue(encoder.encode(sseEncode({ type: 'error', error: message })))
    controller.enqueue(encoder.encode('data: [DONE]\n\n'))
    close()
  }
  function abortRequest() {
    if (closed) return
    closed = true
    const reason = new DOMException('Request cancelled', 'AbortError')
    work.abort(reason)
    controller.error(reason)
    dispose()
  }
  const timeout = () => {
    if (closed) return
    work.abort(new DOMException('Response deadline exceeded', 'TimeoutError'))
    error('Le délai de réponse a été dépassé. Recharge le dossier avant une nouvelle demande.')
  }

  requestSignal.addEventListener('abort', abortRequest, { once: true })
  if (requestSignal.aborted) abortRequest()
  else if (remainingMs <= 0) timeout()
  else timer = setTimeout(timeout, remainingMs)

  return {
    signal: work.signal,
    send: (event: unknown) => write(sseEncode(event)),
    finish: () => { write('data: [DONE]\n\n'); close() },
    error,
    dispose,
    cancel: (reason?: unknown) => {
      closed = true
      work.abort(reason ?? new DOMException('Response cancelled', 'AbortError'))
      dispose()
    },
  }
}
