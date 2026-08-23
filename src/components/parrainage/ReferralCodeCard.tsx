import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface ShareTemplates {
  whatsapp: string
  sms: string
  telegram: string
  twitter: string
  facebook: string
  email: string
}

interface ReferralCodeCardProps {
  code: string | null
  link: string
  share: ShareTemplates
  onCopy: () => void
  onNativeShare: () => void
}

export default function ReferralCodeCard({
  code,
  link,
  share,
  onCopy,
  onNativeShare,
}: ReferralCodeCardProps) {
  return (
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
        <Button variant="primary" size="md" onClick={onCopy}>
          📋 Copier le lien
        </Button>
        <Button variant="secondary" size="md" onClick={onNativeShare}>
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
  )
}
