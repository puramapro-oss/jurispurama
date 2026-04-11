'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { APP_NAME } from '@/lib/constants'

interface ApplyResponse {
  influencer?: { slug: string }
  alreadyApproved?: boolean
  error?: string
}

export default function ApplyInfluencerPage() {
  const router = useRouter()
  const [bio, setBio] = useState('')
  const [instagram, setInstagram] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [youtube, setYoutube] = useState('')
  const [twitter, setTwitter] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [audienceSize, setAudienceSize] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (bio.trim().length < 10) {
      toast.error('Ta bio doit faire au moins 10 caractères.')
      return
    }
    if (reason.trim().length < 10) {
      toast.error('Explique en quelques mots pourquoi tu veux devenir partenaire.')
      return
    }
    const size = Number.parseInt(audienceSize || '0', 10)
    if (Number.isNaN(size) || size < 0) {
      toast.error('Taille d\'audience invalide.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/influencer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio.trim(),
          audienceSize: size,
          reason: reason.trim(),
          socialLinks: {
            instagram: instagram.trim(),
            tiktok: tiktok.trim(),
            youtube: youtube.trim(),
            twitter: twitter.trim(),
            linkedin: linkedin.trim(),
          },
        }),
      })
      const data = (await res.json()) as ApplyResponse
      if (!res.ok || !data.influencer) {
        toast.error(data.error ?? 'Candidature impossible pour le moment.')
        return
      }
      if (data.alreadyApproved) {
        toast.success('Tu es déjà influenceur JurisPurama.')
      } else {
        toast.success('Bienvenue dans le programme influenceur !')
      }
      router.push('/influenceur')
    } catch {
      toast.error('Erreur réseau. Réessaie dans un instant.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <Card padding="lg">
        <header className="mb-6 text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Programme partenaire
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
            Deviens influenceur {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Validation automatique · plan Essentiel offert · jusqu&apos;à 25% de
            commission à vie.
          </p>
        </header>

        <div className="mb-6 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4 text-sm text-[var(--text-secondary)]">
          <p className="font-semibold text-[var(--justice)]">Tes avantages</p>
          <ul className="mt-2 space-y-1">
            <li>✨ Plan <strong>Essentiel offert à vie</strong></li>
            <li>🎯 Lien personnalisé <code>/go/[slug]</code> + page publique
              <code>/p/[slug]</code></li>
            <li>💰 50% du premier paiement + 10% récurrent à vie</li>
            <li>📈 Tableau de bord avec stats en temps réel</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Ta bio (visible sur ta page publique)
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={2000}
              required
              className="rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2 text-sm focus:border-[var(--justice)] focus:outline-none"
              placeholder="Présente-toi en quelques lignes : qui tu es, ton audience, ton univers."
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="instagram"
              label="Instagram"
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@ton_handle ou URL"
            />
            <Input
              id="tiktok"
              label="TikTok"
              type="text"
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
              placeholder="@ton_handle ou URL"
            />
            <Input
              id="youtube"
              label="YouTube"
              type="text"
              value={youtube}
              onChange={(e) => setYoutube(e.target.value)}
              placeholder="URL chaîne"
            />
            <Input
              id="twitter"
              label="Twitter / X"
              type="text"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
              placeholder="@ton_handle ou URL"
            />
            <Input
              id="linkedin"
              label="LinkedIn"
              type="text"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="URL profil"
            />
            <Input
              id="audienceSize"
              label="Taille d'audience totale"
              type="number"
              min={0}
              value={audienceSize}
              onChange={(e) => setAudienceSize(e.target.value)}
              placeholder="Ex. 15000"
              required
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Pourquoi veux-tu parler de JurisPurama ?
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={2000}
              required
              className="rounded-xl border border-[var(--border)] bg-white/70 px-3 py-2 text-sm focus:border-[var(--justice)] focus:outline-none"
              placeholder="Une ligne ou deux sur ton intérêt pour l'accès au droit, la protection des consommateurs, etc."
            />
          </label>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Candidater en 1 clic
          </Button>

          <p className="text-center text-xs text-[var(--text-muted)]">
            En soumettant ce formulaire, tu acceptes les{' '}
            <Link href="/cgu" className="underline">
              CGU
            </Link>{' '}
            et le programme partenaire.
          </p>
        </form>
      </Card>
    </div>
  )
}
