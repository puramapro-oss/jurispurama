'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { APP_DOMAIN } from '@/lib/constants'
import { copyToClipboard } from '@/lib/utils'

export default function ParrainagePage() {
  const { profile } = useAuth()
  const [copied, setCopied] = useState(false)

  const code = profile?.referral_code ?? 'JURIS8'
  const link = `https://${APP_DOMAIN}/signup?ref=${code}`

  const handleCopy = async () => {
    const ok = await copyToClipboard(link)
    if (ok) {
      setCopied(true)
      toast.success('Lien copié dans le presse-papier')
      setTimeout(() => setCopied(false), 2500)
    } else {
      toast.error('Impossible de copier. Sélectionne le lien manuellement.')
    }
  }

  return (
    <div className="container-narrow py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Parrainage
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Parraine des amis
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Pour chaque ami qui s&apos;abonne, tu touches 50% du premier paiement +
          10% récurrent à vie.
        </p>
      </header>

      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Ton code parrain
        </p>
        <p className="mt-1 font-serif text-4xl font-bold text-[var(--justice)]">
          {code}
        </p>
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-white/60 p-3 text-sm font-mono text-[var(--text-primary)] break-all">
          {link}
        </div>
        <div className="mt-4">
          <Button variant="primary" size="md" onClick={handleCopy}>
            {copied ? '✓ Copié' : '📋 Copier le lien'}
          </Button>
        </div>
      </Card>

      <Card padding="lg" className="mt-4">
        <h2 className="mb-2 font-serif text-xl font-semibold text-[var(--justice)]">
          Paliers de récompense
        </h2>
        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
          <li>🥉 <strong>Bronze</strong> — 5 filleuls</li>
          <li>🥈 <strong>Argent</strong> — 10 filleuls</li>
          <li>🥇 <strong>Or</strong> — 25 filleuls</li>
          <li>💎 <strong>Platine</strong> — 50 filleuls</li>
          <li>💠 <strong>Diamant</strong> — 75 filleuls</li>
          <li>👑 <strong>Légende</strong> — 100 filleuls</li>
        </ul>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Le tableau de bord complet (stats, wallet, virements IBAN) arrive
          dans la prochaine mise à jour.
        </p>
      </Card>
    </div>
  )
}
