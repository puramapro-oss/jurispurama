'use client'

import { useState } from 'react'
import { LOCALES, LOCALE_FLAGS, LOCALE_NAMES, type Locale } from '@/lib/i18n'
import { useLocale } from '@/hooks/useLocale'

interface LocaleSwitcherProps {
  variant?: 'dark' | 'light'
  className?: string
}

export default function LocaleSwitcher({
  variant = 'dark',
  className,
}: LocaleSwitcherProps) {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)

  const base =
    variant === 'dark'
      ? 'border-white/15 bg-white/5 text-white/80 hover:border-[var(--gold)]/60 hover:text-[var(--gold)]'
      : 'border-[var(--border-strong)] bg-white text-[var(--justice)] hover:border-[var(--justice)]'

  const menuBase =
    variant === 'dark'
      ? 'border-white/10 bg-[#0A0E1A]/95 text-white/90'
      : 'border-[var(--border-strong)] bg-white text-[var(--justice)]'

  return (
    <div className={'relative inline-block ' + (className ?? '')}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        aria-label="Changer de langue"
        aria-expanded={open}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${base}`}
      >
        <span className="text-base leading-none">{LOCALE_FLAGS[locale]}</span>
        <span className="uppercase">{locale}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 top-11 z-50 min-w-[160px] overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl ${menuBase}`}
        >
          {LOCALES.map((l: Locale) => (
            <button
              key={l}
              type="button"
              role="menuitem"
              onMouseDown={(e) => {
                e.preventDefault()
                setLocale(l)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-white/10 ${
                l === locale ? 'font-semibold text-[var(--gold)]' : ''
              }`}
            >
              <span className="text-base">{LOCALE_FLAGS[l]}</span>
              <span>{LOCALE_NAMES[l]}</span>
              {l === locale && <span className="ml-auto text-[var(--gold)]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
