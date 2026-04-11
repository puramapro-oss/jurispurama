'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import Button from '@/components/ui/Button'

interface SignaturePadProps {
  onReady: (dataUrl: string | null) => void
  disabled?: boolean
  width?: number
  height?: number
}

export default function SignaturePad({
  onReady,
  disabled = false,
  width = 500,
  height = 200,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasStrokes, setHasStrokes] = useState(false)
  const [nowText, setNowText] = useState('')

  // Setup canvas (HiDPI)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#C9A84C'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // Live timestamp
  useEffect(() => {
    const update = () => {
      setNowText(
        new Date().toLocaleString('fr-FR', {
          dateStyle: 'long',
          timeStyle: 'short',
        })
      )
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [])

  const getPoint = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    },
    []
  )

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (disabled) return
      e.preventDefault()
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      drawingRef.current = true
      const pt = getPoint(e)
      lastPointRef.current = pt
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(pt.x, pt.y)
      ctx.lineTo(pt.x + 0.01, pt.y + 0.01)
      ctx.stroke()
    },
    [disabled, getPoint]
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return
      e.preventDefault()
      const pt = getPoint(e)
      const last = lastPointRef.current
      if (!last) return
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return
      ctx.beginPath()
      ctx.moveTo(last.x, last.y)
      ctx.lineTo(pt.x, pt.y)
      ctx.stroke()
      lastPointRef.current = pt
      if (!hasStrokes) setHasStrokes(true)
    },
    [getPoint, hasStrokes]
  )

  const finish = useCallback(() => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (!canvas || !hasStrokes) {
      onReady(null)
      return
    }
    try {
      const dataUrl = canvas.toDataURL('image/png')
      onReady(dataUrl)
    } catch {
      onReady(null)
    }
  }, [hasStrokes, onReady])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, rect.width, rect.height)
    ctx.strokeStyle = '#C9A84C'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setHasStrokes(false)
    onReady(null)
  }, [onReady])

  return (
    <div className="space-y-2">
      <div
        className="relative overflow-hidden rounded-xl border-2 border-[var(--justice)]/20 bg-white shadow-inner"
        style={{ maxWidth: width }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ width: '100%', height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={finish}
          data-testid="signature-canvas"
        />
        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm italic text-[var(--text-muted)]">
              Signe ici avec ta souris ou ton doigt
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] leading-tight text-[var(--text-muted)]">
          {nowText}
          <br />
          <span className="italic">
            Valeur légale — Art. 1366 du Code civil
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clear}
          disabled={disabled || !hasStrokes}
        >
          ✕ Effacer
        </Button>
      </div>
    </div>
  )
}
