'use client'

import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { pickCrossPromoTarget } from '@/lib/cross-promo'

/**
 * BLOC 3 — CROSS-PROMO (V7.1 §15)
 * Promo d'une app Purama cohérente avec JurisPurama (juridique).
 * Mapping : jurispurama → MOKSHA (fiscal/holding) → AKASHA (multi-IA) → KASH.
 * Lien /go/[source]?coupon=WELCOME50 → cookie purama_promo → -50% auto premier mois.
 * Si aucune app live → bloc masqué.
 */
export default function CrossPromoBlock() {
  const target = pickCrossPromoTarget()
  if (!target) return null

  const link = `https://${target.domain}/go/jurispurama?coupon=WELCOME50`

  return (
    <Card
      className="relative overflow-hidden p-6 border"
      style={{
        borderColor: `${target.accent}33`,
        background: `linear-gradient(135deg, ${target.accent}0D 0%, transparent 60%)`,
      }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0"
          style={{ background: `${target.accent}1A`, color: target.accent }}
        >
          {target.icon}
        </div>

        <div className="flex-1 min-w-[200px]">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Découvre {target.name}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide text-white"
              style={{ background: target.accent }}
            >
              -50% + PRIME
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            {target.tagline}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            {target.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-[var(--text-muted)]">
          Premier mois à 4,99€ (au lieu de 9,99€) · +25€ prime wallet J1
        </span>
        <Link
          href={link}
          target="_blank"
          rel="noopener"
          className="shrink-0"
        >
          <Button
            size="sm"
            variant="primary"
            style={{ background: target.accent }}
          >
            Essayer {target.name} →
          </Button>
        </Link>
      </div>
    </Card>
  )
}
