import { useEffect, useRef } from 'react'

export function usePendingChatMessage(initialCaseId: string, sendMessage: (text: string) => Promise<void>) {
  const sent = useRef(false)
  useEffect(() => {
    if (initialCaseId !== 'new') {
      sent.current = false
      return
    }
    if (sent.current) return
    let active = true
    // StrictMode rehearses cleanup before this task. Keep the draft until the
    // surviving effect can send it from an active request scope.
    queueMicrotask(() => {
      if (!active) return
      try {
        const raw = sessionStorage.getItem('jurispurama:pending_message')
        if (!raw) return
        const parsed = JSON.parse(raw) as { message?: unknown } | null
        if (typeof parsed?.message !== 'string' || !parsed.message.trim()) return
        sessionStorage.removeItem('jurispurama:pending_message')
        sent.current = true
        void sendMessage(parsed.message)
      } catch {
        // An unavailable or malformed stored draft does not prevent manual chat.
      }
    })
    return () => { active = false }
  }, [initialCaseId, sendMessage])
}
