/**
 * Cross-promo mapping (V7.1 §15 BLOC 3)
 * JurisPurama (juridique) → apps Purama cohérentes.
 *
 * Ordre priorité : première app LIVE = affichée.
 * Si aucune n'est LIVE → masquer le bloc.
 */

export interface CrossPromoApp {
  slug: string;
  domain: string;
  name: string;
  tagline: string;
  icon: string; // Emoji ou clé Lucide
  accent: string; // CSS color
  live: boolean; // True si app déployée — fallback suivant sinon
  description: string; // 1 ligne
}

export const CROSS_PROMO_TARGETS: CrossPromoApp[] = [
  {
    slug: 'moksha',
    domain: 'moksha.purama.dev',
    name: 'MOKSHA',
    tagline: 'Holding & optimisation fiscale',
    description: 'La holding Purama automatisée. SASU mère-fille, IS 1,25%, paperasse zéro.',
    icon: '⚖️',
    accent: '#A78BFA',
    live: true,
  },
  {
    slug: 'akasha-ai',
    domain: 'akasha.purama.dev',
    name: 'AKASHA',
    tagline: 'Multi-experts IA en un seul chat',
    description: '12 experts IA spécialisés (avocat, comptable, médecin…) — poses ta question, elle choisit.',
    icon: '🪬',
    accent: '#06B6D4',
    live: true,
  },
  {
    slug: 'kash',
    domain: 'kash.purama.dev',
    name: 'KASH',
    tagline: 'Ta finance perso pilotée par IA',
    description: 'Budget, placements, optimisation fiscale personnelle. Dashboards clairs.',
    icon: '💰',
    accent: '#F59E0B',
    live: false, // placeholder
  },
];

/**
 * Retourne l'app Purama à promouvoir pour cette app source (jurispurama).
 * Fallback sur la suivante si la priorité 1 n'est pas live.
 */
export function pickCrossPromoTarget(): CrossPromoApp | null {
  return CROSS_PROMO_TARGETS.find((app) => app.live) ?? null;
}

/**
 * Slugs reconnus comme "apps Purama source" (pour /go/[slug]?coupon=WELCOME50).
 * Si /go/[slug] reçoit un slug dans cette liste, il traite comme cross-promo
 * (set cookie purama_promo) au lieu d'influenceur.
 */
export const PURAMA_APP_SLUGS = new Set([
  'midas',
  'sutra',
  'moksha',
  'vida',
  'akasha',
  'akasha-ai',
  'purama-ai',
  'purama-origin',
  'veda',
  'sangha',
  'prana',
  'aether',
  'exodus',
  'mana',
  'lumios',
  'kaia',
  'adya',
  'satya',
  'karma',
  'kash',
  'jurispurama',
  'purama_compta',
  'compta',
]);

/**
 * Nom du cookie purama_promo (V7.1 §15 flow auto-apply).
 * Structure JSON : { coupon, source, expires_iso }
 */
export const PROMO_COOKIE_NAME = 'purama_promo';
export const PROMO_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours
