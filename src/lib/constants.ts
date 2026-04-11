export const SUPER_ADMIN_EMAIL = 'matiss.frasne@gmail.com'

export const APP_NAME = 'JurisPurama'
export const APP_SLUG = 'jurispurama'
export const APP_DOMAIN = 'jurispurama.purama.dev'
export const APP_SCHEMA = 'jurispurama'
export const APP_COLOR_PRIMARY = '#1E3A5F'
export const APP_COLOR_ACCENT = '#C9A84C'
export const APP_TAGLINE =
  "L'assistant juridique IA qui remplace ton avocat à 99%"
export const APP_PITCH =
  'Raconte ton problème. En 3 minutes, tu as un plan d\'action + dossier complet. JurisIA rédige, signe et envoie à ta place.'

export const COMPANY_INFO = {
  name: 'SASU PURAMA',
  address: '8 Rue de la Chapelle, 25560 Frasne',
  country: 'France',
  taxNote: 'TVA non applicable, art. 293 B du CGI',
  dpo: 'matiss.frasne@gmail.com',
  contactEmail: 'contact@purama.dev',
  legalRep: 'Matiss Dornier',
}

export const PLANS = {
  free: {
    id: 'free',
    label: 'Gratuit',
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      '3 consultations IA par mois',
      'Analyse juridique basique',
      'Accès au chat JurisIA',
    ],
  },
  essentiel: {
    id: 'essentiel',
    label: 'Essentiel',
    priceMonthly: 999,
    priceYearly: 8390,
    features: [
      'Consultations illimitées',
      '5 documents générés / mois',
      'Signature électronique incluse',
      'Suivi de dossier',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    priceMonthly: 1999,
    priceYearly: 16790,
    features: [
      'Tout Essentiel',
      'Documents illimités',
      '3 recommandés AR / mois inclus',
      'Profil juridique complet',
    ],
    popular: true,
  },
  avocat_virtuel: {
    id: 'avocat_virtuel',
    label: 'Avocat Virtuel',
    priceMonthly: 3999,
    priceYearly: 33590,
    features: [
      'Tout Pro',
      'Recommandés AR illimités',
      'Alertes deadlines automatiques',
      'Suivi avancé multi-dossiers',
      'Support prioritaire',
    ],
  },
} as const

export type PlanId = keyof typeof PLANS

export const PUBLIC_ROUTES = [
  '/',
  '/pricing',
  '/how-it-works',
  '/ecosystem',
  '/changelog',
  '/status',
  '/blog',
  '/offline',
  '/login',
  '/signup',
  '/forgot-password',
  '/aide',
  '/contact',
  '/parrainage',
  '/mentions-legales',
  '/politique-confidentialite',
  '/cgv',
  '/cgu',
  '/cookies',
]

export const LEGAL_DOMAINS = [
  { id: 'amende', label: 'Amendes & Infractions', icon: '🚗' },
  { id: 'travail', label: 'Droit du travail', icon: '💼' },
  { id: 'logement', label: 'Logement', icon: '🏠' },
  { id: 'consommation', label: 'Consommation', icon: '🛒' },
  { id: 'famille', label: 'Famille', icon: '👨‍👩‍👧' },
  { id: 'administratif', label: 'Administratif', icon: '📋' },
  { id: 'fiscal', label: 'Fiscal', icon: '💶' },
  { id: 'penal', label: 'Pénal', icon: '⚖️' },
  { id: 'sante', label: 'Santé', icon: '🏥' },
  { id: 'assurance', label: 'Assurances', icon: '🛡️' },
  { id: 'numerique', label: 'Numérique / RGPD', icon: '💻' },
  { id: 'affaires', label: 'Affaires', icon: '🏢' },
] as const
