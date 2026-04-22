'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useAuth } from '@/hooks/useAuth'
import { APP_DOMAIN } from '@/lib/constants'
import { copyToClipboard } from '@/lib/utils'

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
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Parrainage
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Parraine des amis, gagne de l&apos;argent
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          Pour chaque ami qui s&apos;abonne via ton lien, tu touches{' '}
          <strong>50% de son premier paiement</strong> +{' '}
          <strong>10% récurrent à vie</strong>, payés par virement dès 5 €
          accumulés.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Ton code parrain
          </p>
          <p className="mt-1 font-serif text-4xl font-bold text-[var(--justice)]">
            {code ?? '—'}
          </p>
          <div className="mt-4 rounded-xl border border-[var(--border)] bg-white/60 p-3 text-sm font-mono break-all text-[var(--text-primary)]">
            {link}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" size="md" onClick={handleCopy}>
              📋 Copier le lien
            </Button>
            <Button variant="secondary" size="md" onClick={handleNativeShare}>
              📤 Partager
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <a
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-sm transition hover:border-[var(--justice)]"
              href={share.whatsapp}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <a
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-sm transition hover:border-[var(--justice)]"
              href={share.sms}
            >
              SMS
            </a>
            <a
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-sm transition hover:border-[var(--justice)]"
              href={share.telegram}
              target="_blank"
              rel="noreferrer"
            >
              Telegram
            </a>
            <a
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-sm transition hover:border-[var(--justice)]"
              href={share.twitter}
              target="_blank"
              rel="noreferrer"
            >
              Twitter
            </a>
            <a
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-sm transition hover:border-[var(--justice)]"
              href={share.facebook}
              target="_blank"
              rel="noreferrer"
            >
              Facebook
            </a>
            <a
              className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-center text-sm transition hover:border-[var(--justice)]"
              href={share.email}
            >
              Email
            </a>
          </div>
        </Card>

        <Card padding="lg" className="flex flex-col items-center">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            QR Code
          </p>
          {qrUrl ? (
            <img
              src={qrUrl}
              alt="QR Code de ton lien de parrainage"
              className="mt-3 h-48 w-48"
            />
          ) : (
            <div className="mt-3 flex h-48 w-48 items-center justify-center rounded-xl bg-[var(--parchment)] text-xs text-[var(--text-muted)]">
              Génération…
            </div>
          )}
          <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
            Imprime-le, colle-le partout
          </p>
        </Card>
      </div>

      {/* Stats + tier */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Inscriptions
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {loading ? '…' : stats?.totalSignups ?? 0}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Conversions payantes
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {loading ? '…' : stats?.totalConversions ?? 0}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Commissions totales
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {(stats?.totalCommission ?? 0).toFixed(2)} €
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Disponible pour retrait
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--gold-dark)]">
            {(stats?.pendingCommission ?? 0).toFixed(2)} €
          </p>
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            onClick={handleWithdraw}
            loading={withdrawLoading}
            disabled={(stats?.pendingCommission ?? 0) < 5}
            className="mt-3"
          >
            Demander un virement
          </Button>
        </Card>
      </div>

      {/* Tier progression */}
      <Card padding="lg" className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Palier actuel
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-[var(--justice)]">
              {tier ? `${tier.emoji} ${tier.label}` : '🌱 Débutant'}
            </p>
            {tier && tier.bonusRecurringPct > 0 && (
              <p className="text-xs text-[var(--gold-dark)]">
                Bonus +{tier.bonusRecurringPct}% récurrent
              </p>
            )}
          </div>
          {next && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Prochain palier
              </p>
              <p className="font-serif text-lg text-[var(--justice)]">
                {next.emoji} {next.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {next.minConversions} parrainages
              </p>
            </div>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--justice)] to-[var(--gold)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Paliers : 🌱 Débutant · 🥉 Bronze (5) · 🥈 Argent (10) · 🥇 Or (25)
          · 💎 Platine (50) · 💠 Diamant (75) · 👑 Légende (100)
        </p>
      </Card>

      {/* Filleuls */}
      <Card padding="lg" className="mt-6">
        <h2 className="mb-4 font-serif text-xl font-semibold text-[var(--justice)]">
          Historique de tes filleuls
        </h2>
        {!stats || stats.recentReferrals.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Aucun filleul pour le moment. Partage ton lien pour commencer à
            gagner.
          </p>
        ) : (
          <ul className="space-y-2">
            {stats.recentReferrals.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Filleul #{i + 1}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(r.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.status === 'converted' ? (
                    <Badge variant="green">Payant</Badge>
                  ) : (
                    <Badge variant="gray">En attente</Badge>
                  )}
                  <span className="font-mono text-sm font-semibold text-[var(--justice)]">
                    {Number(r.commission_paid ?? 0).toFixed(2)} €
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

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
