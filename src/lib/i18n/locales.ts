// Locale definitions and metadata

export type Locale =
  | 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ar' | 'zh'
  | 'ja' | 'ko' | 'hi' | 'ru' | 'tr' | 'nl' | 'pl' | 'sv'

export const LOCALES: Locale[] = [
  'fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'zh',
  'ja', 'ko', 'hi', 'ru', 'tr', 'nl', 'pl', 'sv',
]

export const DEFAULT_LOCALE: Locale = 'fr'

export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹',
  ar: '🇸🇦', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', ru: '🇷🇺',
  tr: '🇹🇷', nl: '🇳🇱', pl: '🇵🇱', sv: '🇸🇪',
}

export const LOCALE_NAMES: Record<Locale, string> = {
  fr: 'Français', en: 'English', es: 'Español', de: 'Deutsch',
  it: 'Italiano', pt: 'Português', ar: 'العربية', zh: '中文',
  ja: '日本語', ko: '한국어', hi: 'हिन्दी', ru: 'Русский',
  tr: 'Türkçe', nl: 'Nederlands', pl: 'Polski', sv: 'Svenska',
}
