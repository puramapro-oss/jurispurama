'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'

interface Props {
  amount: number
  onClose: () => void
}

/**
 * Magic Moment (V7.1 §20) — animation plein écran premier retrait
 * - 3 secondes fade-in
 * - Son cristallin (si supporté)
 * - Badge "Premier Retrait"
 * - Message personnalisé
 * - Story auto proposition
 */
export default function MagicMoment({ amount, onClose }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100)
    // Son cristallin (AudioContext minimal)
    try {
      const Ctor =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).AudioContext || (window as any).webkitAudioContext
      if (Ctor) {
        const ctx = new Ctor()
        const now = ctx.currentTime
        ;[523.25, 659.25, 783.99].forEach((freq, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = freq
          gain.gain.setValueAtTime(0.0001, now + i * 0.12)
          gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.12 + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.8)
          osc.connect(gain).connect(ctx.destination)
          osc.start(now + i * 0.12)
          osc.stop(now + i * 0.12 + 0.8)
        })
      }
    } catch {
      // silent
    }
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-700 ${
        ready ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background:
          'radial-gradient(circle at center, rgba(30,58,95,0.95) 0%, rgba(201,168,76,0.85) 100%)',
      }}
    >
      <div className="relative max-w-md w-full text-center text-white">
        {/* Particules fond */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {Array.from({ length: 30 }).map((_, i) => (
            <span
              key={i}
              className="absolute w-1.5 h-1.5 bg-white rounded-full opacity-70 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="text-7xl mb-4 animate-bounce" aria-hidden>
            💎
          </div>
          <p className="text-sm uppercase tracking-widest mb-2 opacity-80">
            Ton premier retrait
          </p>
          <p className="font-serif text-5xl font-bold mb-4 tabular-nums">
            {amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
          <p className="text-lg mb-2">
            Tu viens de prouver que Purama fonctionne pour toi.
          </p>
          <p className="text-sm opacity-90 mb-8">
            Garde cette preuve. Tu mérites ce que tu reçois.
          </p>

          <div className="inline-block bg-white/15 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-white/30">
            <span className="text-xs uppercase tracking-wider font-semibold">
              🏆 Badge « Premier Retrait »
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={onClose}
              className="!bg-white !text-[var(--justice)] hover:!bg-white/90"
              fullWidth
            >
              Continuer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
