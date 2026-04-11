'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/dashboard', label: 'Accueil', icon: '📊' },
  { href: '/dossiers', label: 'Dossiers', icon: '📁' },
  { href: '/chat', label: 'Nouveau', icon: '⚖️' },
  { href: '/scanner', label: 'Scanner', icon: '📷' },
  { href: '/profil', label: 'Profil', icon: '👤' },
]

export default function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-white/95 backdrop-blur-xl px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      aria-label="Navigation principale"
    >
      <ul className="flex items-center justify-around">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(tab.href))
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors',
                  active
                    ? 'text-[var(--justice)]'
                    : 'text-[var(--text-muted)]'
                )}
              >
                <span className="text-xl" aria-hidden="true">
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
