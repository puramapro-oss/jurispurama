'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Props {
  totalGains: number
  year: number
}

/**
 * Banner fiscal (V7.1 §25)
 * - Affiché si totalGains > 3000€
 * - Dismissible (cookie) jusqu'au 1er avril
 * - Réapparaît 1er avril → disparaît définitivement 15 juin
 */
export default function FiscalBanner({ totalGains, year }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(`jurispurama-fiscal-dismissed-${year}`)
    if (stored === '1') setDismissed(true)
  }, [year])

  if (dismissed || totalGains < 3000) return null

  const exceeded = totalGains - 3000

  return (
    <div className="mb-6 rounded-2xl border-2 border-[var(--gold)] bg-gradient-to-r from-[var(--gold)]/10 via-white to-[var(--gold)]/5 p-5 shadow-sm">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="text-3xl" aria-hidden>
          📋
        </div>
        <div className="flex-1 min-w-[240px]">
          <h3 className="font-serif text-lg font-semibold text-[var(--justice)]">
            Seuil fiscal dépassé ({year})
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Tu as gagné plus de 3 000€ cette année ({exceeded.toFixed(2)}€ au-dessus du
            seuil). Tu devras déclarer en case 5NG sur impots.gouv.fr. Purama
            t&apos;envoie automatiquement ton récapitulatif en janvier.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/fiscal"
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--justice)] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[var(--justice-dark)] transition-colors"
            >
              En savoir plus
            </Link>
            <button
              onClick={() => {
                localStorage.setItem(`jurispurama-fiscal-dismissed-${year}`, '1')
                setDismissed(true)
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-alt)] transition-colors"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
