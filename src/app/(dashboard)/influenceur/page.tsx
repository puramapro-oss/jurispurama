'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { APP_DOMAIN } from '@/lib/constants'
import { copyToClipboard } from '@/lib/utils'

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
    benefits: ['Avocat Virtuel offert', 'Page perso premium', 'Coach IA 20 msg/jour'],
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

const LEADERBOARD = [
  { rank: 1, name: 'Astrid T.', conversions: 187, commissions: 3920 },
  { rank: 2, name: 'Sami R.', conversions: 143, commissions: 2840 },
  { rank: 3, name: 'Nadia K.', conversions: 112, commissions: 2215 },
  { rank: 4, name: 'Pierre L.', conversions: 98, commissions: 1940 },
  { rank: 5, name: 'Mélanie G.', conversions: 87, commissions: 1720 },
  { rank: 6, name: 'Yassin D.', conversions: 73, commissions: 1450 },
  { rank: 7, name: 'Camille V.', conversions: 61, commissions: 1205 },
  { rank: 8, name: 'Jules B.', conversions: 54, commissions: 1065 },
  { rank: 9, name: 'Rania S.', conversions: 48, commissions: 950 },
  { rank: 10, name: 'Thomas E.', conversions: 42, commissions: 830 },
]

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
    text: "Tu viens de recevoir une amende ? JurisPurama (@jurispurama) rédige ta contestation en 2 minutes et l'envoie en recommandé à ta place. Lien -50% : ",
  },
  {
    title: 'Caution retenue',
    text: "Ton proprio refuse de rendre ta caution ? JurisIA fait la mise en demeure, tu signes et c'est parti. 1200€ récupérés pour Karim sans tribunal. Essaie avec mon lien : ",
  },
  {
    title: 'URSSAF / impôts',
    text: "Auto-entrepreneur qui se sent harcelé par l'URSSAF ? JurisPurama rédige ton recours, cite les articles, signe et envoie. Essaie avec mon lien : ",
  },
]

export default function InfluenceurPage() {
  const [loading, setLoading] = useState(true)
  const [influencer, setInfluencer] = useState<Influencer | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)

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

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/influencer')
      if (!res.ok) return
      const data = (await res.json()) as { influencer: Influencer | null }
      setInfluencer(data.influencer)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!influencer) return
    QRCode.toDataURL(goLink, {
      width: 256,
      margin: 1,
      color: { dark: '#1E3A5F', light: '#FFFFFF00' },
    })
      .then(setQrUrl)
      .catch(() => setQrUrl(null))
  }, [influencer, goLink])

  async function handleCopy(link: string) {
    const ok = await copyToClipboard(link)
    if (ok) toast.success('Lien copié')
    else toast.error('Impossible de copier')
  }

  if (loading) {
    return (
      <div className="container-narrow py-10">
        <p className="text-sm text-[var(--text-muted)]">Chargement de ton espace influenceur…</p>
      </div>
    )
  }

  // Not influencer yet
  if (!influencer) {
    return (
      <div className="container-narrow py-10">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Programme partenaire
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
            Deviens influenceur JurisPurama
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Validation automatique en 1 clic. Plan Essentiel offert à vie,
            commissions jusqu&apos;à 25%, page publique personnalisée.
          </p>
        </header>
        <Card padding="lg">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-serif text-xl font-semibold text-[var(--justice)]">
                Tu n&apos;es pas encore partenaire
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Remplis le formulaire (2 minutes) et accède à ton espace dédié
                immédiatement.
              </p>
            </div>
            <Link href="/apply/influenceur">
              <Button variant="primary" size="md">
                Candidater maintenant →
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const tierInfo = TIER_INFO[influencer.tier]

  return (
    <div className="container-narrow py-10">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Espace influenceur
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Clics</p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {influencer.total_clicks}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Inscriptions</p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {influencer.total_signups}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Conversions</p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {influencer.total_conversions}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Commissions</p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--gold-dark)]">
            {Number(influencer.total_commissions ?? 0).toFixed(2)} €
          </p>
        </Card>
      </div>

      {/* Links */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Ton lien d&apos;affiliation
          </p>
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-white/60 p-3 text-sm font-mono break-all text-[var(--text-primary)]">
            {goLink}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => handleCopy(goLink)}>
              📋 Copier
            </Button>
            <a href={goLink} target="_blank" rel="noreferrer">
              <Button variant="secondary" size="sm">
                Tester
              </Button>
            </a>
          </div>

          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Ta page publique
            </p>
            <div className="mt-2 rounded-xl border border-[var(--border)] bg-white/60 p-3 text-sm font-mono break-all text-[var(--text-primary)]">
              {publicLink}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => handleCopy(publicLink)}>
                📋 Copier
              </Button>
              <a href={publicLink} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">
                  Voir la page
                </Button>
              </a>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="flex flex-col items-center">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">QR Code</p>
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code de ton lien partenaire" className="mt-3 h-48 w-48" />
          ) : (
            <div className="mt-3 flex h-48 w-48 items-center justify-center rounded-xl bg-[var(--parchment)] text-xs text-[var(--text-muted)]">
              Génération…
            </div>
          )}
        </Card>
      </div>

      {/* Tier benefits */}
      <Card padding="lg" className="mt-6">
        <div className="mb-3">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Avantages {tierInfo.label}
          </p>
          <p className="font-serif text-xl font-semibold text-[var(--justice)]">
            {tierInfo.emoji} Palier {tierInfo.label}
          </p>
        </div>
        <ul className="grid gap-2 text-sm text-[var(--text-secondary)] md:grid-cols-2">
          {tierInfo.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--gold)]">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Kit créateur */}
      <Card padding="lg" className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
          Kit créateur
        </h2>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Bannières prêtes à utiliser, générées par Pollinations. Clic droit →
          enregistrer l&apos;image.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {KIT_BANNERS.map((b) => (
            <a
              key={b.title}
              href={b.url}
              target="_blank"
              rel="noreferrer"
              className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white transition hover:border-[var(--justice)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.url}
                alt={b.title}
                loading="lazy"
                className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
              />
              <p className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
                {b.title}
              </p>
            </a>
          ))}
        </div>
      </Card>

      {/* Templates */}
      <Card padding="lg" className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
          Templates de publication
        </h2>
        <div className="space-y-3">
          {TEMPLATES.map((t) => {
            const fullText = t.text + goLink
            return (
              <div
                key={t.title}
                className="rounded-xl border border-[var(--border)] bg-white/60 p-4"
              >
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--gold-dark)]">
                  {t.title}
                </p>
                <p className="text-sm text-[var(--text-primary)]">{fullText}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleCopy(fullText)}
                >
                  📋 Copier le texte
                </Button>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Leaderboard */}
      <Card padding="lg" className="mt-6">
        <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
          Top 10 influenceurs du mois
        </h2>
        <ul className="space-y-2">
          {LEADERBOARD.map((row) => (
            <li
              key={row.rank}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 px-4 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 font-bold text-[var(--gold-dark)]">
                  #{row.rank}
                </span>
                <span className="text-[var(--text-primary)]">{row.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>{row.conversions} conv.</span>
                <span className="font-mono font-semibold text-[var(--justice)]">
                  {(row.commissions / 100).toFixed(2)} €
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Classement actualisé chaque lundi à 9h (Paris).
        </p>
      </Card>
    </div>
  )
}
