'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import NotificationBell from '@/components/layout/NotificationBell'
import {
  LayoutGrid,
  FolderClosed,
  MessageSquareText,
  FileSignature,
  UserRound,
  CreditCard,
  HelpCircle,
  Shield,
  LogOut,
} from 'lucide-react'

const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Tableau de bord', Icon: LayoutGrid },
  { href: '/dossiers', label: 'Mes dossiers', Icon: FolderClosed },
  { href: '/chat', label: 'Nouveau dossier', Icon: MessageSquareText },
  { href: '/documents', label: 'Documents', Icon: FileSignature },
  { href: '/profil', label: 'Profil juridique', Icon: UserRound },
  { href: '/abonnement', label: 'Abonnement', Icon: CreditCard },
] as const

const SECONDARY_NAV = [
  { href: '/parrainage', label: 'Parrainage' },
  { href: '/ambassadeur', label: 'Ambassadeur' },
  { href: '/financer', label: 'Financer' },
  { href: '/aide', label: 'Aide & FAQ' },
] as const

export default function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut, isSuperAdmin } = useAuth()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <aside className="hidden lg:flex sticky top-0 h-screen w-[260px] xl:w-[280px] flex-col border-r border-[var(--border)] bg-white/60 backdrop-blur-xl">
      {/* Brand + bell */}
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[var(--justice)] focus-ring rounded-lg"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-base text-white shadow-sm">
            ⚖
          </span>
          <span className="font-serif text-[19px] font-semibold tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <NotificationBell />
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-0.5">
          {PRIMARY_NAV.map(({ href, label, Icon }) => {
            const active = isActive(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all touch-target focus-ring',
                    active
                      ? 'bg-[var(--justice)] text-white shadow-sm'
                      : 'text-[var(--text-secondary)] hover:bg-white/80 hover:text-[var(--justice)]'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={18} aria-hidden="true" strokeWidth={1.8} />
                  <span className="truncate">{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Secondary section */}
        <div className="mt-6">
          <p className="px-3 mb-2 text-eyebrow">Plus</p>
          <ul className="flex flex-col gap-0.5">
            {SECONDARY_NAV.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'block rounded-lg px-3 py-2 text-[13px] font-medium transition-colors focus-ring',
                      active
                        ? 'bg-[var(--gold)]/15 text-[var(--gold-dark)]'
                        : 'text-[var(--text-muted)] hover:bg-white/60 hover:text-[var(--justice)]'
                    )}
                    aria-current={active ? 'page' : undefined}
                  >
                    {label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {isSuperAdmin && (
          <div className="mt-6">
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors focus-ring',
                pathname.startsWith('/admin')
                  ? 'bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] text-[var(--justice-dark)] shadow-sm'
                  : 'text-[var(--gold-dark)] hover:bg-[var(--gold)]/10'
              )}
            >
              <Shield size={16} strokeWidth={2} aria-hidden="true" />
              Admin
            </Link>
          </div>
        )}
      </nav>

      {/* User card */}
      <div className="border-t border-[var(--border)] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/60 px-2.5 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-[12px] font-semibold text-white shadow-sm">
            {getInitials(profile?.full_name ?? profile?.email ?? null)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
              {profile?.full_name ?? 'Utilisateur'}
            </p>
            <p className="truncate text-[11px] text-[var(--text-muted)]">
              {profile?.email}
            </p>
          </div>
          <button
            onClick={signOut}
            type="button"
            aria-label="Se déconnecter"
            className="touch-target shrink-0 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-white hover:text-[var(--justice)] focus-ring"
          >
            <LogOut size={16} strokeWidth={1.8} />
          </button>
        </div>
        <p className="mt-2 px-1 text-[10px] text-[var(--text-muted)]">
          <Link
            href="/aide"
            className="inline-flex items-center gap-1 hover:text-[var(--justice)]"
          >
            <HelpCircle size={10} /> Besoin d&apos;aide ?
          </Link>
        </p>
      </div>
    </aside>
  )
}
