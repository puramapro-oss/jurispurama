import { redirect } from 'next/navigation'

/**
 * /subscribe → redirect vers /abonnement.
 * Existe pour matcher le pattern V7.1 §15 (BLOC 3 cross-promo : purama.dev/subscribe?app=…)
 * et la checklist §23 App Store (lien canonical depuis mobile).
 *
 * Si l'utilisateur n'est pas authentifié, /abonnement redirect vers /login?next=/abonnement
 * via le middleware.
 */
export default function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; billing?: string; app?: string }>
}) {
  // Next 16 — searchParams est async
  // Forward les params vers /abonnement
  return (async () => {
    const params = await searchParams
    const qs = new URLSearchParams()
    if (params.plan) qs.set('plan', params.plan)
    if (params.billing) qs.set('billing', params.billing)
    const query = qs.toString()
    redirect(`/abonnement${query ? `?${query}` : ''}`)
  })()
}
