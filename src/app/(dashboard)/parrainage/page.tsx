'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { useAuth } from '@/hooks/useAuth'
import { APP_DOMAIN } from '@/lib/constants'
import { copyToClipboard } from '@/lib/utils'
import ReferralHeader from '@/components/parrainage/ReferralHeader'
import ReferralCodeCard from '@/components/parrainage/ReferralCodeCard'
import ReferralQRCard from '@/components/parrainage/ReferralQRCard'
import ReferralStats from '@/components/parrainage/ReferralStats'
import ReferralTierProgress from '@/components/parrainage/ReferralTierProgress'
import ReferralHistory from '@/components/parrainage/ReferralHistory'

interface ReferralStatsResponse {
  stats: {
    code: string | null
    totalClicks: number
    totalSignups: number
    totalConversions: number
    pendingCommission: number
    paidCommission: number
    totalCommission: number
    tier: {
      tier: string
      label: string
      emoji: string
      minConversions: number
      bonusRecurringPct: number
    }
    nextTier: {
      tier: string
      label: string
      emoji: string
      minConversions: number
      bonusRecurringPct: number
    } | null
    progressPct: number
    recentReferrals: Array<{
      id: string
      created_at: string
      status: string
      commission_paid: number
    }>
  }
}

function buildShareTemplates(link: string) {
  const msg = `J'ai découvert JurisPurama, un assistant juridique IA qui rédige ta contestation, la signe et l'envoie à ta place. Amende, caution, URSSAF — ça marche pour tout. Essaie avec mon lien, -50% sur ton premier mois : ${link}`
  const short = `JurisPurama t'aide à te défendre en 3 minutes. -50% avec mon lien : ${link}`
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(msg)}`,
    sms: `sms:?body=${encodeURIComponent(short)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(short)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(short)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    email: `mailto:?subject=${encodeURIComponent(
      'JurisPurama — Assistant juridique IA'
    )}&body=${encodeURIComponent(msg)}`,
  }
}

export default function ParrainagePage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<ReferralStatsResponse['stats'] | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  const code = stats?.code ?? profile?.referral_code ?? null
  const link = useMemo(
    () =>
      code
        ? `https://${APP_DOMAIN}/signup?ref=${code}`
        : `https://${APP_DOMAIN}/signup`,
    [code]
  )
  const share = useMemo(() => buildShareTemplates(link), [link])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/referral')
      if (!res.ok) return
      const data = (await res.json()) as ReferralStatsResponse
      setStats(data.stats)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    QRCode.toDataURL(link, {
      width: 256,
      margin: 1,
      color: { dark: '#1E3A5F', light: '#FFFFFF00' },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(null))
  }, [link])

  async function handleCopy() {
    const ok = await copyToClipboard(link)
    if (ok) toast.success('Lien copié')
    else toast.error('Impossible de copier')
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator).share({
          title: 'JurisPurama',
          text: 'Assistant juridique IA — -50% avec mon lien',
          url: link,
        })
      } catch {
        // User cancelled
      }
      return
    }
    await handleCopy()
  }

  async function handleWithdraw() {
    if (!stats) return
    if (stats.pendingCommission < 5) {
      toast.error('Retrait minimum 5 €.')
      return
    }
    setWithdrawLoading(true)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_withdrawal' }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Demande impossible pour le moment.')
        return
      }
      toast.success('Demande de virement envoyée. Délai 3 à 5 jours ouvrés.')
      await refresh()
    } catch {
      toast.error('Erreur réseau. Réessaie.')
    } finally {
      setWithdrawLoading(false)
    }
  }

  const tier = stats?.tier
  const next = stats?.nextTier
  const progress = stats?.progressPct ?? 0

  return (
    <div className="container-narrow py-10">
      <ReferralHeader />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ReferralCodeCard
          code={code}
          link={link}
          share={share}
          onCopy={handleCopy}
          onNativeShare={handleNativeShare}
        />
        <ReferralQRCard qrUrl={qrUrl} />
      </div>

      <ReferralStats
        totalSignups={stats?.totalSignups ?? 0}
        totalConversions={stats?.totalConversions ?? 0}
        totalCommission={stats?.totalCommission ?? 0}
        pendingCommission={stats?.pendingCommission ?? 0}
        loading={loading}
        withdrawLoading={withdrawLoading}
        onWithdraw={handleWithdraw}
      />

      <ReferralTierProgress tier={tier} next={next} progress={progress} />

      <ReferralHistory referrals={stats?.recentReferrals ?? null} />

      <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
        Envie de passer au niveau supérieur ?{' '}
        <Link
          href="/apply/ambassadeur"
          className="underline hover:text-[var(--justice)]"
        >
          Deviens ambassadeur JurisPurama
        </Link>{' '}
        et touche jusqu&apos;à 25% de commission + plan gratuit.
      </p>
    </div>
  )
}
