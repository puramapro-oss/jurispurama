'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { getPalette } from '@/lib/brand/palette-generator'
import type { ShaderVariant } from '@/lib/brand/purama-adn'

const MeshGradient = dynamic(
  () => import('@paper-design/shaders-react').then((m) => m.MeshGradient),
  { ssr: false }
)

interface Props {
  seed: string
  variant?: ShaderVariant
  className?: string
  overlayOpacity?: number
  fallbackImage?: string
  children?: React.ReactNode
}

/**
 * PuramaBackground — Paper Shaders mesh gradient
 * - WebGL fallback → gradient CSS + couleur colorBack
 * - prefers-reduced-motion → speed = 0 (stable)
 * - document.hidden → pause speed
 */
export function PuramaBackground({
  seed,
  variant = 'hero',
  className = '',
  overlayOpacity = 0,
  fallbackImage,
  children,
}: Props) {
  const [webgl, setWebgl] = useState(true)
  const [reduced, setReduced] = useState(false)
  const [visible, setVisible] = useState(true)
  const palette = useMemo(() => getPalette(seed, variant), [seed, variant])

  useEffect(() => {
    try {
      const c = document.createElement('canvas')
      setWebgl(
        !!(c.getContext('webgl') || c.getContext('experimental-webgl'))
      )
    } catch {
      setWebgl(false)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const h = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    const h = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', h)
    return () => document.removeEventListener('visibilitychange', h)
  }, [])

  if (!webgl) {
    return (
      <div
        className={`relative w-full h-full ${className}`}
        style={{
          background: fallbackImage
            ? `url(${fallbackImage}) center/cover, ${palette.colorBack}`
            : `linear-gradient(135deg, ${palette.colors[0]} 0%, ${palette.colors[1]} 50%, ${palette.colorBack} 100%)`,
        }}
      >
        {overlayOpacity > 0 && (
          <div
            className="absolute inset-0 bg-black pointer-events-none"
            style={{ opacity: overlayOpacity }}
          />
        )}
        <div className="relative z-10 w-full h-full">{children}</div>
      </div>
    )
  }

  const speed = reduced || !visible ? 0 : palette.speed

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ background: palette.colorBack }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <MeshGradient
          colors={palette.colors}
          distortion={palette.distortion}
          swirl={palette.swirl}
          speed={speed}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0 bg-black pointer-events-none"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  )
}

export default PuramaBackground
