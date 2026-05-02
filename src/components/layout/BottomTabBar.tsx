'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutGrid,
  FolderClosed,
  MessageSquareText,
  FileSignature,
  UserRound,
} from 'lucide-react'

type Tab = {
  href: string
  label: string
  Icon: typeof LayoutGrid
  primary?: boolean
}

const TABS: readonly Tab[] = [
  { href: '/dashboard', label: 'Accueil', Icon: LayoutGrid },
  { href: '/dossiers', label: 'Dossiers', Icon: FolderClosed },
  { href: '/chat', label: 'Nouveau', Icon: MessageSquareText, primary: true },
  { href: '/documents', label: 'Documents', Icon: FileSignature },
  { href: '/profil', label: 'Profil', Icon: UserRound },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur-xl px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      aria-label="Navigation principale"
    >
      <ul className="flex items-stretch justify-around">
        {TABS.map(({ href, label, Icon, primary }) => {
          const active = isActive(href)
          if (primary) {
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  className="flex flex-col items-center gap-0.5 px-2 py-1 focus-ring rounded-xl"
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl transition-all',
                      'bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-white shadow-md shadow-[var(--justice)]/30',
                      active && 'shadow-lg ring-2 ring-[var(--gold)]/40 scale-105'
                    )}
                  >
                    <Icon size={20} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--justice)]">
                    {label}
                  </span>
                </Link>
              </li>
            )
          }
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 transition-colors focus-ring touch-target',
                  active
                    ? 'text-[var(--justice)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--justice)]'
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
