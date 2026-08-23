import Image from 'next/image'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface InfluencerLinksProps {
  goLink: string
  publicLink: string
  qrUrl: string | null
  onCopy: (link: string) => void
}

export default function InfluencerLinks({
  goLink,
  publicLink,
  qrUrl,
  onCopy,
}: InfluencerLinksProps) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card padding="lg">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          Ton lien d&apos;affiliation
        </p>
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-white/60 p-3 text-sm font-mono break-all text-[var(--text-primary)]">
          {goLink}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={() => onCopy(goLink)}>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCopy(publicLink)}
            >
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
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
          QR Code
        </p>
        {qrUrl ? (
          <Image
            src={qrUrl}
            alt="QR Code de ton lien partenaire"
            width={192}
            height={192}
            className="mt-3"
          />
        ) : (
          <div className="mt-3 flex h-48 w-48 items-center justify-center rounded-xl bg-[var(--parchment)] text-xs text-[var(--text-muted)]">
            Génération…
          </div>
        )}
      </Card>
    </div>
  )
}
