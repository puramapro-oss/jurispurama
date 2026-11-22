'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import Badge from '@/components/ui/Badge'
import { APP_DOMAIN } from '@/lib/constants'
import { copyToClipboard } from '@/lib/utils'
import NotInfluencerYet from '@/components/ambassadeur/NotInfluencerYet'
import InfluencerStats from '@/components/ambassadeur/InfluencerStats'
import InfluencerLinks from '@/components/ambassadeur/InfluencerLinks'
import TierBenefits from '@/components/ambassadeur/TierBenefits'
import CreatorKit from '@/components/ambassadeur/CreatorKit'
import PublicationTemplates from '@/components/ambassadeur/PublicationTemplates'
import AmbassadorLeaderboard from '@/components/ambassadeur/AmbassadorLeaderboard'

interface Influencer {
  id: string
  slug: string
  bio: string | null
  social_links: Record<string, string> | null
  audience_size: number
  approved: boolean
  tier:
    | 'bronze'
    | 'argent'
    | 'or'
    | 'platine'
    | 'diamant'
    | 'legende'
    | 'titan'
    | 'eternel'
  free_plan_granted: string | null
  total_clicks: number
  total_signups: number
  total_conversions: number
  total_commissions: number
  created_at: string
}

const TIER_INFO: Record<
  Influencer['tier'],
  {
    label: string
    emoji: string
    benefits: string[]
    commissionPct: number
  }
> = {
  bronze: {
    label: 'Bronze',
    emoji: '🥉',
    benefits: ['Plan Essentiel offert à vie', 'Lien /go + page /p publique', 'Académie niveau 1'],
    commissionPct: 10,
  },
  argent: {
    label: 'Argent',
    emoji: '🥈',
    benefits: ['Plan Pro offert', 'Early access 7 jours', 'Académie niveau 2'],
    commissionPct: 11,
  },
  or: {
    label: 'Or',
    emoji: '🥇',
    benefits: ['Plan Premium offert', 'Page perso premium', 'Coach IA 20 msg/jour'],
    commissionPct: 12,
  },
  platine: {
    label: 'Platine',
    emoji: '💎',
    benefits: ['Accès événements', 'Priorité features', 'Contact direct équipe'],
    commissionPct: 13,
  },
  diamant: {
    label: 'Diamant',
    emoji: '💠',
    benefits: ['Statut VIP', 'Commissions majorées +5%', 'Équipe dédiée'],
    commissionPct: 15,
  },
  legende: {
    label: 'Légende',
    emoji: '👑',
    benefits: ['Commissions héréditaires', 'Bêta accès', 'Récompenses spéciales'],
    commissionPct: 17,
  },
  titan: {
    label: 'Titan',
    emoji: '🛡️',
    benefits: ['Ligne produit dédiée', 'Commissions à vie', 'Partenariat Tissma'],
    commissionPct: 20,
  },
  eternel: {
    label: 'Éternel',
    emoji: '✨',
    benefits: ['1% des parts', 'Commissions héréditaires illimitées'],
    commissionPct: 25,
  },
}

const KIT_BANNERS = [
  {
    title: 'Bannière hero 1200×630',
    url: 'https://image.pollinations.ai/prompt/legal%20assistant%20AI%20blue%20navy%20gold%20scale%20of%20justice%20minimal%20french%20design?width=1200&height=630&model=flux&enhance=true&nologo=true',
  },
  {
    title: 'Story verticale 1080×1920',
    url: 'https://image.pollinations.ai/prompt/justice%20scale%20gold%20navy%20blue%20minimal%20legal%20french%20app%20story?width=1080&height=1920&model=flux&enhance=true&nologo=true',
  },
  {
    title: 'Feed carré 1080×1080',
    url: 'https://image.pollinations.ai/prompt/lawyer%20AI%20assistant%20navy%20gold%20minimal%20square%20legal%20french?width=1080&height=1080&model=flux&enhance=true&nologo=true',
  },
]

const TEMPLATES = [
  {
    title: 'Amende routière',
    text: "Tu viens de recevoir une amende ? JurisPurama (@jurispurama) t'aide à préparer ta contestation et propose un envoi en recommandé. Lien -50% : ",
  },
  {
    title: 'Caution retenue',
    text: "Ton proprio refuse de rendre ta caution ? JurisIA t'aide à préparer une mise en demeure que tu peux relire, signer et envoyer. Essaie avec mon lien : ",
  },
  {
    title: 'URSSAF / impôts',
    text: "Auto-entrepreneur qui se sent harcelé par l'URSSAF ? JurisPurama rédige ton recours, cite les articles, signe et envoie. Essaie avec mon lien : ",
  },
]

export default function AmbassadeurPage() {
  const [loading, setLoading] = useState(true)
  const [influencer, setInfluencer] = useState<Influencer | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const requestRef = useRef<AbortController | null>(null)

  const goLink = useMemo(
    () =>
      influencer
        ? `https://${APP_DOMAIN}/go/${influencer.slug}`
        : `https://${APP_DOMAIN}`,
    [influencer]
  )
  const publicLink = useMemo(
    () =>
      influencer
        ? `https://${APP_DOMAIN}/p/${influencer.slug}`
        : `https://${APP_DOMAIN}`,
    [influencer]
  )

  const load = useCallback(() => {
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    return fetch('/api/influencer', { signal: controller.signal }).then(async (res) => {
      if (controller.signal.aborted) return
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { influencer: Influencer | null }
      if (!controller.signal.aborted) setInfluencer(data.influencer)
    }).catch(() => {
      if (!controller.signal.aborted) toast.error('Impossible de charger ton espace ambassadeur. Réessaie.')
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
  }, [])

  useEffect(() => {
    void load()
    return () => requestRef.current?.abort()
  }, [load])

  useEffect(() => {
    if (!influencer) return
    let active = true
    QRCode.toDataURL(goLink, {
      width: 256,
      margin: 1,
      color: { dark: '#1E3A5F', light: '#FFFFFF00' },
    })
      .then((url) => { if (active) setQrUrl(url) })
      .catch(() => { if (active) setQrUrl(null) })
    return () => { active = false }
  }, [influencer, goLink])

  async function handleCopy(link: string) {
    const ok = await copyToClipboard(link)
    if (ok) toast.success('Lien copié')
    else toast.error('Impossible de copier')
  }

  if (loading) {
    return (
      <div className="container-narrow py-10">
        <p className="text-sm text-[var(--text-muted)]">Chargement de ton espace ambassadeur…</p>
      </div>
    )
  }

  // Not influencer yet
  if (!influencer) {
    return <NotInfluencerYet />
  }

  const tierInfo = TIER_INFO[influencer.tier]

  return (
    <div className="container-narrow py-10">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Espace ambassadeur
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
            Ton tableau de bord partenaire
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Slug :{' '}
            <code className="rounded bg-[var(--parchment)] px-2 py-0.5 text-[var(--justice)]">
              {influencer.slug}
            </code>
          </p>
        </div>
        <Badge variant="gold" size="md">
          {tierInfo.emoji} {tierInfo.label} · {tierInfo.commissionPct}%
        </Badge>
      </header>

      <InfluencerStats
        totalClicks={influencer.total_clicks}
        totalSignups={influencer.total_signups}
        totalConversions={influencer.total_conversions}
        totalCommissions={influencer.total_commissions}
      />

      <InfluencerLinks
        goLink={goLink}
        publicLink={publicLink}
        qrUrl={qrUrl}
        onCopy={handleCopy}
      />

      <TierBenefits tierInfo={tierInfo} />

      <CreatorKit banners={KIT_BANNERS} />

      <PublicationTemplates
        templates={TEMPLATES}
        goLink={goLink}
        onCopy={handleCopy}
      />

      {/* The existing API exposes personal totals, not a verified public ranking. */}
      <AmbassadorLeaderboard leaderboard={[]} />
    </div>
  )
}
