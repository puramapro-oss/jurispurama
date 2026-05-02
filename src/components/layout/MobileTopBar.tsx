'use client'

import Link from 'next/link'
import { APP_NAME } from '@/lib/constants'
import NotificationBell from '@/components/layout/NotificationBell'

export default function MobileTopBar() {
  return (
    <header
      className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[var(--border)]/60 bg-white/85 backdrop-blur-xl px-4 py-2.5"
      style={{ paddingTop: 'calc(0.625rem + env(safe-area-inset-top))' }}
    >
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-[var(--justice)] focus-ring rounded-lg"
        aria-label={APP_NAME}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-white text-sm shadow-sm">
          ⚖
        </span>
        <span className="font-serif text-base font-semibold tracking-tight">
          {APP_NAME}
        </span>
      </Link>
      <NotificationBell />
    </header>
  )
}
