'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/useLocale'
import LocaleSwitcher from '@/components/shared/LocaleSwitcher'
import ThemeToggle from '@/components/shared/ThemeToggle'

export default function LandingHeader() {
  const { t } = useLocale()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-white/10 bg-[#05070F]/85 backdrop-blur-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6)]'
          : 'border-b border-white/[0.04] bg-[#05070F]/40 backdrop-blur-md'
      }`}
    >
      <div className="container-wide flex h-16 items-center justify-between md:h-[72px]">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white"
          aria-label="JurisPurama — accueil"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl text-xl"
            style={{
              background:
                'linear-gradient(135deg, #1E3A5F 0%, #2A5384 50%, #C9A84C 120%)',
              boxShadow: '0 0 20px rgba(201, 168, 76, 0.22)',
            }}
          >
            ⚖️
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight text-white md:text-2xl">
            JurisPurama
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13.5px] font-medium text-white/70 lg:flex">
          <Link href="/how-it-works" className="transition hover:text-[var(--gold)]">
            {t.nav.howItWorks}
          </Link>
          <Link href="/pricing" className="transition hover:text-[var(--gold)]">
            {t.nav.pricing}
          </Link>
          <Link href="/ecosystem" className="transition hover:text-[var(--gold)]">
            {t.nav.ecosystem}
          </Link>
          <Link href="/aide" className="transition hover:text-[var(--gold)]">
            {t.nav.help}
          </Link>
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <Link
            href="/login"
            className="ml-1 rounded-full px-4 py-2 text-sm font-medium text-white/80 transition hover:text-white"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-5 text-sm font-semibold text-[var(--justice-dark)] shadow-lg shadow-[rgba(201,168,76,0.28)] transition hover:brightness-105"
          >
            {t.nav.signup}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white lg:hidden"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M6 18L18 6" />
              </>
            ) : (
              <>
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#05070F]/95 px-6 py-5 backdrop-blur-xl lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-white/85">
            <Link href="/how-it-works" onClick={() => setOpen(false)}>
              {t.nav.howItWorks}
            </Link>
            <Link href="/pricing" onClick={() => setOpen(false)}>
              {t.nav.pricing}
            </Link>
            <Link href="/ecosystem" onClick={() => setOpen(false)}>
              {t.nav.ecosystem}
            </Link>
            <Link href="/aide" onClick={() => setOpen(false)}>
              {t.nav.help}
            </Link>
            <Link href="/login" onClick={() => setOpen(false)}>
              {t.nav.login}
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-5 text-sm font-semibold text-[var(--justice-dark)]"
            >
              {t.nav.signup}
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
