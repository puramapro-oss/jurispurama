import { useCallback, useEffect, useRef } from 'react'

export function useScrollManagement(messages: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

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
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    autoScrollRef.current = nearBottom
  }, [])

  useEffect(() => {
    if (autoScrollRef.current) scrollToBottom(true)
  }, [messages, scrollToBottom])

  return {
    scrollRef,
    scrollToBottom,
    handleScroll,
  }
}
