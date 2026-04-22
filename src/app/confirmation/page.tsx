'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

/**
 * Page de confirmation post-Stripe Checkout (V7.1 §21).
 * - Deep link mobile purama://activate (via window.location) — redirige vers l'app si installée
 * - Confettis plein écran
 * - Annonce prime J1 25€ créditée sur wallet
 * - CTA retour dashboard web
 */
function ConfirmationContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'Essentiel'
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Deep link mobile — tentative silencieuse, timeout 1.5s
    const t = setTimeout(() => {
      if (document.visibilityState === 'visible') return
    }, 1500)

    if (typeof window !== 'undefined' && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      // Tentative deep link : ouvre l'app si installée, sinon revient à la page web
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = 'purama://activate?app=jurispurama'
      document.body.appendChild(iframe)
      setTimeout(() => iframe.remove(), 1000)
    }

    setShowConfetti(true)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-gradient-to-br from-[var(--justice)]/5 via-white to-[var(--gold)]/5 relative overflow-hidden">
      {/* Confettis CSS (simple, pas de lib) */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="absolute block w-2 h-2 rounded-full animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}%`,
                background: ['#1E3A5F', '#C9A84C', '#6D28D9', '#22C55E', '#F59E0B'][i % 5],
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-fall { animation: fall linear forwards; }
      `}</style>

      <Card className="max-w-lg w-full p-8 text-center relative z-10 border-2 border-[var(--gold)]/30">
        <div className="text-6xl mb-4" aria-hidden>🎉</div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--justice)] mb-2">
          Bienvenue dans ton abonnement {plan}&nbsp;!
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Ton accès est immédiatement activé. JurisIA est à ta disposition en illimité
          pour tous tes dossiers.
        </p>

        {/* Prime J1 */}
        <div className="rounded-2xl bg-gradient-to-br from-[var(--gold)]/10 to-[var(--justice)]/10 p-5 mb-6 border border-[var(--gold)]/20">
          <div className="flex items-center justify-center gap-2 text-[var(--gold-dark)] mb-1">
            <span className="text-2xl">💰</span>
            <span className="font-semibold">Prime J1 créditée</span>
          </div>
          <p className="font-serif text-3xl font-bold text-[var(--justice)]">25,00&nbsp;€</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Sur ton wallet Purama. Les tranches J+30 (25€) et J+60 (50€) suivront automatiquement.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/dashboard">
            <Button variant="primary" size="lg" fullWidth>
              Accéder à mon espace
            </Button>
          </Link>
          <Link href="/wallet">
            <Button variant="ghost" size="md" fullWidth>
              Voir mon wallet
            </Button>
          </Link>
        </div>

        <p className="mt-6 text-[10px] leading-tight text-[var(--text-muted)]">
          En choisissant l&apos;accès immédiat, tu as renoncé à ton droit de rétractation
          de 14 jours (art. L221-28 3° Code conso). Les crédits de prime sont disponibles
          au retrait après 30 jours d&apos;abonnement actif. Voir{' '}
          <Link href="/cgv" className="underline hover:text-[var(--justice)]">
            CGV
          </Link>
          .
        </p>
      </Card>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
