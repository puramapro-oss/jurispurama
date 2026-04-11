'use client'

import { useEffect, useRef } from 'react'

export default function CursorGlow() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    // Respect reduced motion + avoid on touch devices
    if (typeof window === 'undefined') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const touch = window.matchMedia('(pointer: coarse)').matches
    if (reduced || touch) return

    const el = ref.current
    if (!el) return

    let rafId = 0
    let targetX = -9999
    let targetY = -9999
    let curX = -9999
    let curY = -9999

    const tick = (): void => {
      curX += (targetX - curX) * 0.12
      curY += (targetY - curY) * 0.12
      el.style.transform = `translate3d(${curX}px, ${curY}px, 0)`
      rafId = requestAnimationFrame(tick)
    }
    const onMove = (e: MouseEvent): void => {
      targetX = e.clientX
      targetY = e.clientY
    }
    document.addEventListener('mousemove', onMove, { passive: true })
    rafId = requestAnimationFrame(tick)
    return () => {
      document.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-0 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-3xl"
      style={{
        background:
          'radial-gradient(circle, rgba(201, 168, 76, 0.6) 0%, rgba(30, 58, 95, 0.25) 40%, transparent 70%)',
        willChange: 'transform',
      }}
    />
  )
}
