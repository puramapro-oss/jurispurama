'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_LOCALE,
  getTranslations,
  isValidLocale,
  type Locale,
} from '@/lib/i18n'

const STORAGE_KEY = 'jurispurama-lang'

export function useLocale(): {
  locale: Locale
  setLocale: (l: Locale) => void
  t: ReturnType<typeof getTranslations>
  mounted: boolean
} {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isValidLocale(stored)) {
        setLocaleState(stored)
        return
      }
      // Fallback: browser language
      const nav = navigator.language.slice(0, 2).toLowerCase()
      if (isValidLocale(nav)) {
        setLocaleState(nav)
      }
    } catch {
      /* storage unavailable */
    }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
      document.documentElement.lang = l
    } catch {
      /* storage unavailable */
    }
  }, [])

  return { locale, setLocale, t: getTranslations(locale), mounted }
}
