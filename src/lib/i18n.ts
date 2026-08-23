// Lightweight i18n — 16 languages. FR is the source of truth — app is French-first.
// Full translations for fr, en, es. Other locales fall back to en.

export type { TranslationKeys } from './i18n/types'
export { LOCALES, DEFAULT_LOCALE, LOCALE_FLAGS, LOCALE_NAMES, type Locale } from './i18n/locales'
import type { TranslationKeys } from './i18n/types'
import type { Locale } from './i18n/locales'
import { fr } from './i18n/fr'
import { en } from './i18n/en'
import { es } from './i18n/es'
import { LOCALES } from './i18n/locales'

// Full translations for fr, en, es. Other locales fall back to en at runtime.
export const TRANSLATIONS: Partial<Record<Locale, TranslationKeys>> = {
  fr,
  en,
  es,
}

export function getTranslations(locale: Locale): TranslationKeys {
  return TRANSLATIONS[locale] ?? TRANSLATIONS.en!
}

export function isValidLocale(x: string | null | undefined): x is Locale {
  return typeof x === 'string' && (LOCALES as string[]).includes(x)
}
