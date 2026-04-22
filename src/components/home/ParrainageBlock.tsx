'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

interface ParrainageStats {
  referralCode: string | null
  totalReferrals: number
  totalEarnings: number
}

/**
 * BLOC 1 — PARRAINAGE (V7.1 §15)
 * Above-the-fold dashboard : lien copiable + QR + compteur filleuls + gains.
 * Si 0 filleul → message amorçage "Ton premier filleul te rapporte X€".
 */
export default function ParrainageBlock() {
  const [stats, setStats] = useState<ParrainageStats | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        setStats({
          referralCode: data.referral_code ?? data.code ?? null,
          totalReferrals: data.total_referrals ?? data.filleuls_count ?? 0,
          totalEarnings: data.total_earned ?? data.earnings_total ?? 0,
        })
      })
      .catch(() => {
        /* silent */
      })
  }, [])

  const referralUrl = stats?.referralCode
    ? `https://jurispurama.purama.dev/signup?ref=${stats.referralCode}`
    : null

  async function copyLink() {
    if (!referralUrl) return
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      toast.success('Lien copié !')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier. Utilise le lien affiché.')
    }
  }

  async function share() {
    if (!referralUrl) return
    const text = `Rejoins JurisPurama et gagne -50% sur ton premier mois via mon lien : ${referralUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'JurisPurama', text, url: referralUrl })
      } catch {
        /* user canceled */
      }
    } else {
      copyLink()
    }
  }

  const zero = !stats || stats.totalReferrals === 0

  return (
    <Card className="relative overflow-hidden border-[var(--justice)]/20 bg-gradient-to-br from-[var(--justice)]/5 to-[var(--gold)]/5 p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl" aria-hidden>
              🎁
            </span>
            <h3 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Parrainage
            </h3>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {zero
              ? 'Ton premier filleul te rapporte 5€ dès son inscription. Gains récurrents 10% à vie.'
              : `${stats!.totalReferrals} filleul${stats!.totalReferrals > 1 ? 's' : ''} actif${stats!.totalReferrals > 1 ? 's' : ''}.`}
          </p>
        </div>

        {stats && (
          <div className="text-right">
            <div className="text-3xl font-serif font-semibold text-[var(--gold-dark)] tabular-nums">
              {stats.totalEarnings.toLocaleString('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              })}
            </div>
            <div className="text-xs text-[var(--text-muted)]">Gains cumulés</div>
          </div>
        )}
      </div>

      {referralUrl && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 truncate rounded-lg bg-white/80 px-3 py-2 text-xs font-mono text-[var(--justice)] border border-[var(--border)]">
            {referralUrl}
          </code>
          <Button variant="secondary" size="sm" onClick={copyLink}>
            {copied ? '✓ Copié' : 'Copier'}
          </Button>
          <Button variant="primary" size="sm" onClick={share}>
            Partager
          </Button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-[var(--text-muted)]">
          Parrain : 50% 1er paiement + 10% récurrent à vie
        </span>
        <Link
          href="/parrainage"
          className="text-[var(--justice)] hover:underline"
        >
          Voir détails →
        </Link>
      </div>
    </Card>
  )
}
