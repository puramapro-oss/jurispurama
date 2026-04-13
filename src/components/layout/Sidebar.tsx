'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/dossiers', label: 'Mes dossiers', icon: '📁' },
  { href: '/chat', label: 'Nouveau dossier', icon: '⚖️' },
  { href: '/scanner', label: 'Scanner', icon: '📷' },
  { href: '/documents', label: 'Documents', icon: '📄' },
  { href: '/profil', label: 'Profil juridique', icon: '👤' },
  { href: '/breathe', label: 'Respiration', icon: '🌬️' },
  { href: '/gratitude', label: 'Gratitude', icon: '🙏' },
  { href: '/abonnement', label: 'Abonnement', icon: '💳' },
  { href: '/wallet', label: 'Wallet', icon: '💰' },
  { href: '/points', label: 'Points', icon: '✨' },
  { href: '/financer', label: 'Financer', icon: '🏛️' },
  { href: '/parrainage', label: 'Parrainage', icon: '🎁' },
  { href: '/influenceur', label: 'Influenceur', icon: '⭐' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut, isSuperAdmin } = useAuth()

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-64 flex-col border-r border-[var(--border)] bg-white/60 backdrop-blur-xl px-4 py-6">
      <Link
        href="/dashboard"
        className="mb-8 flex items-center gap-2 px-2 text-[var(--justice)]"
      >
        <span className="text-2xl">⚖️</span>
        <span className="font-serif text-xl font-semibold">{APP_NAME}</span>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--justice)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-white hover:text-[var(--justice)]'
              )}
            >
              <span className="text-lg" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}

        {isSuperAdmin && (
          <Link
            href="/admin"
            className={cn(
              'mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
              pathname.startsWith('/admin')
                ? 'bg-[var(--gold)] text-[var(--justice-dark)]'
                : 'text-[var(--gold-dark)] hover:bg-[var(--gold)]/10'
            )}
          >
            <span className="text-lg">🛡️</span>
            Admin
          </Link>
        )}
      </nav>

      <div className="mt-6 border-t border-[var(--border)] pt-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--justice)] text-sm font-semibold text-white">
            {getInitials(profile?.full_name ?? profile?.email ?? null)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--text-primary)]">
              {profile?.full_name ?? 'Utilisateur'}
            </p>
            <p className="truncate text-xs text-[var(--text-muted)]">
              {profile?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          onClick={signOut}
        >
          Déconnexion
        </Button>
      </div>
    </aside>
  )
}
