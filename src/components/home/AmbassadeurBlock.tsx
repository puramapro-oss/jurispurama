'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface AmbassadorTier {
  name: string
  threshold: number
  prime: number
  color: string
}

const TIERS: AmbassadorTier[] = [
  { name: 'Bronze', threshold: 10, prime: 200, color: '#CD7F32' },
  { name: 'Argent', threshold: 25, prime: 500, color: '#C0C0C0' },
  { name: 'Or', threshold: 50, prime: 1000, color: '#D4AF37' },
  { name: 'Platine', threshold: 100, prime: 2500, color: '#E5E4E2' },
  { name: 'Diamant', threshold: 250, prime: 6000, color: '#B9F2FF' },
  { name: 'Légende', threshold: 500, prime: 12000, color: '#6D28D9' },
  { name: 'Titan', threshold: 1000, prime: 25000, color: '#1E3A5F' },
  { name: 'Dieu', threshold: 5000, prime: 100000, color: '#C9A84C' },
  { name: 'Éternel', threshold: 10000, prime: 200000, color: '#F59E0B' },
]

function pickCurrentTier(referrals: number): {
  current: AmbassadorTier | null
  next: AmbassadorTier | null
  progress: number
} {
  let current: AmbassadorTier | null = null
  let next: AmbassadorTier | null = TIERS[0]
  for (const tier of TIERS) {
    if (referrals >= tier.threshold) {
      current = tier
    } else {
      next = tier
      break
    }
  }
  if (current && current.name === 'Éternel') next = null
  const base = current?.threshold ?? 0
  const target = next?.threshold ?? base
  const progress = target > base ? Math.min(100, ((referrals - base) / (target - base)) * 100) : 100
  return { current, next, progress }
}

/**
 * BLOC 2 — PROGRAMME AMBASSADEUR (V7.1 §15)
 * Paliers visuels + barre progression + CTA postuler.
 * Terme "Ambassadeur" EXCLUSIVEMENT — jamais "Influenceur" dans l'UI.
 */
export default function AmbassadeurBlock() {
  const [referrals, setReferrals] = useState(0)
  const [isAmbassador, setIsAmbassador] = useState(false)

  useEffect(() => {
    fetch('/api/influencer', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setReferrals(data.total_conversions ?? data.referrals_count ?? 0)
        setIsAmbassador(Boolean(data.approved ?? data.is_ambassador))
      })
      .catch(() => {
        /* silent */
      })
  }, [])

  const { current, next, progress } = pickCurrentTier(referrals)

  return (
    <Card className="relative overflow-hidden border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold)]/10 via-white to-[var(--justice)]/5 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl" aria-hidden>
              ⭐
            </span>
            <h3 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Deviens Ambassadeur
            </h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {isAmbassador
              ? `Palier actuel : ${current?.name ?? 'Débutant'}. Prime cumulée : ${current ? current.prime.toLocaleString('fr-FR') : '0'}€.`
              : 'Active ton espace ambassadeur : liens uniques, QR, gains récurrents 10% à vie, primes jusqu\'à 200 000€.'}
          </p>
        </div>

        {current && (
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
            style={{ background: current.color }}
          >
            {current.name}
          </span>
        )}
      </div>

      {/* Barre progression vers palier suivant */}
      {next && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[var(--text-muted)]">
              {referrals} / {next.threshold} filleuls → <strong>{next.name}</strong> ({next.prime.toLocaleString('fr-FR')}€)
            </span>
            <span className="text-[var(--text-muted)]">{Math.floor(progress)}%</span>
          </div>
          <div className="h-2 bg-black/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--justice)] to-[var(--gold)] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Mini paliers visuels */}
      <div className="mt-4 flex flex-wrap gap-1.5 text-[10px]">
        {TIERS.slice(0, 6).map((tier) => {
          const reached = current && TIERS.indexOf(current) >= TIERS.indexOf(tier)
          return (
            <span
              key={tier.name}
              className="px-2 py-1 rounded-md font-medium"
              style={{
                background: reached ? tier.color : 'transparent',
                color: reached ? '#fff' : 'var(--text-muted)',
                border: reached ? 'none' : '1px solid var(--border)',
              }}
            >
              {tier.name}
            </span>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        {isAmbassador ? (
          <Link href="/ambassadeur" className="flex-1">
            <Button variant="primary" size="sm" fullWidth>
              Mon espace ambassadeur
            </Button>
          </Link>
        ) : (
          <Link href="/apply/ambassadeur" className="flex-1">
            <Button variant="primary" size="sm" fullWidth>
              Postuler comme Ambassadeur
            </Button>
          </Link>
        )}
      </div>
    </Card>
  )
}
