import Link from 'next/link'
import Card from '@/components/ui/Card'

interface ProfileProgressCardProps {
  profilePercent: number
  loading: boolean
}

export default function ProfileProgressCard({
  profilePercent,
  loading,
}: ProfileProgressCardProps) {
  return (
    <Link href="/profil" className="block">
      <Card
        padding="md"
        className="h-full transition-all hover:border-[var(--justice)]/30 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Profil juridique
            </p>
            <p className="mt-1 font-serif text-2xl font-bold text-[var(--justice)]">
              {loading ? '…' : `${profilePercent}% complété`}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {profilePercent < 40
                ? 'Complète ton profil pour des documents mieux pré-remplis.'
                : 'Ton profil est bien renseigné. Modifie-le à tout moment.'}
            </p>
          </div>
          <span className="text-4xl" aria-hidden="true">
            👤
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--justice)]/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--justice)] via-[var(--justice-light)] to-[var(--gold)] transition-all"
            style={{ width: `${profilePercent}%` }}
          />
        </div>
      </Card>
    </Link>
  )
}
