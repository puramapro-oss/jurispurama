/**
 * Configuration brand — injecté via env vars Vercel.
 * Voir V7.1 §16 Skills + PURAMA_MASTER_UPGRADE PART 3.
 */
export const APP_SEED =
  process.env.NEXT_PUBLIC_PALETTE_SEED ?? 'finance-premium-luxury-jurispurama';
export const APP_SLUG = process.env.NEXT_PUBLIC_APP_SLUG ?? 'jurispurama';
