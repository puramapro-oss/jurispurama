/**
 * JurisPurama — Parrainage
 *
 * Logique :
 *  - 50% du premier paiement du filleul → commission parrain
 *  - 10% récurrent à vie sur chaque renouvellement
 *  - Paliers Bronze/Argent/Or/Platine/Diamant/Légende augmentent le %
 *
 * Le storage repose sur :
 *  - jurispurama_users.referred_by = code parrain textuel
 *  - jurispurama_referrals (referrer_id, referred_id, code, status, commission_paid)
 */
import { createServiceClient } from '@/lib/supabase'

export type ReferralTier =
  | 'bronze'
  | 'argent'
  | 'or'
  | 'platine'
  | 'diamant'
  | 'legende'
  | 'none'

export interface TierInfo {
  tier: ReferralTier
  label: string
  emoji: string
  minConversions: number
  bonusRecurringPct: number // bonus additionnel par rapport au 10% de base
}

export const TIERS: TierInfo[] = [
  {
    tier: 'none',
    label: 'Débutant',
    emoji: '🌱',
    minConversions: 0,
    bonusRecurringPct: 0,
  },
  {
    tier: 'bronze',
    label: 'Bronze',
    emoji: '🥉',
    minConversions: 5,
    bonusRecurringPct: 0,
  },
  {
    tier: 'argent',
    label: 'Argent',
    emoji: '🥈',
    minConversions: 10,
    bonusRecurringPct: 2,
  },
  {
    tier: 'or',
    label: 'Or',
    emoji: '🥇',
    minConversions: 25,
    bonusRecurringPct: 5,
  },
  {
    tier: 'platine',
    label: 'Platine',
    emoji: '💎',
    minConversions: 50,
    bonusRecurringPct: 10,
  },
  {
    tier: 'diamant',
    label: 'Diamant',
    emoji: '💠',
    minConversions: 75,
    bonusRecurringPct: 15,
  },
  {
    tier: 'legende',
    label: 'Légende',
    emoji: '👑',
    minConversions: 100,
    bonusRecurringPct: 20,
  },
]

export function computeTier(conversions: number): {
  current: TierInfo
  next: TierInfo | null
  progressPct: number
} {
  const reversed = [...TIERS].reverse()
  const current = reversed.find((t) => conversions >= t.minConversions) ?? TIERS[0]
  const idx = TIERS.findIndex((t) => t.tier === current.tier)
  const next = idx >= 0 && idx < TIERS.length - 1 ? TIERS[idx + 1] : null
  const progressPct = next
    ? Math.min(
        100,
        Math.round(
          ((conversions - current.minConversions) /
            (next.minConversions - current.minConversions)) *
            100
        )
      )
    : 100
  return { current, next, progressPct }
}

/**
 * Lookup a referrer by referral_code (case-insensitive, normalized uppercase).
 */
export async function findReferrerByCode(code: string): Promise<{
  id: string
  email: string
  referral_code: string
} | null> {
  const sb = createServiceClient()
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null
  const { data } = await sb
    .from('jurispurama_users')
    .select('id, email, referral_code')
    .eq('referral_code', normalized)
    .maybeSingle()
  return data ?? null
}

/**
 * Called at signup when ?ref=CODE is present. Creates a pending referral row.
 */
export async function trackReferralSignup(params: {
  referralCode: string
  newUserId: string
}): Promise<boolean> {
  const sb = createServiceClient()
  const referrer = await findReferrerByCode(params.referralCode)
  if (!referrer) return false
  if (referrer.id === params.newUserId) return false

  // Persist the code on the new user
  await sb
    .from('jurispurama_users')
    .update({ referred_by: referrer.referral_code })
    .eq('id', params.newUserId)

  // Upsert referral row (unique pair referrer+referred)
  const { data: existing } = await sb
    .from('jurispurama_referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', params.newUserId)
    .maybeSingle()
  if (!existing) {
    await sb.from('jurispurama_referrals').insert({
      referrer_id: referrer.id,
      referred_id: params.newUserId,
      code: referrer.referral_code,
      status: 'pending',
      commission_paid: 0,
    })
  }
  return true
}

/**
 * Called on the FIRST successful invoice payment of a referred user.
 * Flags the referral as converted and credits 50% first-payment commission.
 */
export async function convertReferral(params: {
  referredUserId: string
  firstPaymentAmountEuros: number
}): Promise<void> {
  const sb = createServiceClient()
  const { data: user } = await sb
    .from('jurispurama_users')
    .select('id, referred_by')
    .eq('id', params.referredUserId)
    .maybeSingle()
  if (!user?.referred_by) return

  const referrer = await findReferrerByCode(user.referred_by)
  if (!referrer) return

  const commission = Math.round(params.firstPaymentAmountEuros * 50) / 100 // 50%

  const { data: row } = await sb
    .from('jurispurama_referrals')
    .select('id, commission_paid, status')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', user.id)
    .maybeSingle()

  if (row) {
    await sb
      .from('jurispurama_referrals')
      .update({
        status: 'converted',
        commission_paid: Number(row.commission_paid ?? 0) + commission,
      })
      .eq('id', row.id)
  } else {
    await sb.from('jurispurama_referrals').insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      code: referrer.referral_code,
      status: 'converted',
      commission_paid: commission,
    })
  }

  await sb.from('jurispurama_payments').insert({
    user_id: referrer.id,
    stripe_payment_id: `referral_first_${user.id}`,
    amount: commission,
    type: 'dossier', // "dossier" = compat bucket ; real nature is referral commission
    status: 'pending',
  })

  await sb.from('jurispurama_notifications').insert({
    user_id: referrer.id,
    type: 'referral_converted',
    title: `${commission.toFixed(2)} € de commission`,
    message:
      'Un de tes filleuls vient de souscrire un abonnement JurisPurama. Ta commission arrive dans ton wallet.',
    link: '/parrainage',
  })
}

/**
 * Called on each subsequent invoice payment (renewals).
 * Applies 10% base + tier bonus.
 */
export async function applyRecurringCommission(params: {
  referredUserId: string
  amountEuros: number
}): Promise<void> {
  const sb = createServiceClient()
  const { data: user } = await sb
    .from('jurispurama_users')
    .select('id, referred_by')
    .eq('id', params.referredUserId)
    .maybeSingle()
  if (!user?.referred_by) return

  const referrer = await findReferrerByCode(user.referred_by)
  if (!referrer) return

  // Tier bonus
  const { count } = await sb
    .from('jurispurama_referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', referrer.id)
    .eq('status', 'converted')
  const { current } = computeTier(count ?? 0)
  const rate = (10 + current.bonusRecurringPct) / 100
  const commission = Math.round(params.amountEuros * rate * 100) / 100

  const { data: row } = await sb
    .from('jurispurama_referrals')
    .select('id, commission_paid')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', user.id)
    .maybeSingle()

  if (row) {
    await sb
      .from('jurispurama_referrals')
      .update({
        commission_paid: Number(row.commission_paid ?? 0) + commission,
      })
      .eq('id', row.id)
  }

  await sb.from('jurispurama_payments').insert({
    user_id: referrer.id,
    stripe_payment_id: `referral_recurring_${user.id}_${Date.now()}`,
    amount: commission,
    type: 'dossier',
    status: 'pending',
  })
}

/**
 * Aggregate stats for the /parrainage dashboard.
 */
export interface ReferralStats {
  code: string | null
  totalClicks: number
  totalSignups: number
  totalConversions: number
  pendingCommission: number
  paidCommission: number
  totalCommission: number
  tier: TierInfo
  nextTier: TierInfo | null
  progressPct: number
  recentReferrals: Array<{
    id: string
    created_at: string
    status: string
    commission_paid: number
  }>
}

export async function getReferralStats(
  jurisUserId: string
): Promise<ReferralStats> {
  const sb = createServiceClient()
  const { data: user } = await sb
    .from('jurispurama_users')
    .select('id, referral_code')
    .eq('id', jurisUserId)
    .maybeSingle()

  const { data: referrals } = await sb
    .from('jurispurama_referrals')
    .select('id, created_at, status, commission_paid')
    .eq('referrer_id', jurisUserId)
    .order('created_at', { ascending: false })
    .limit(50)

  const list = referrals ?? []
  const totalSignups = list.length
  const totalConversions = list.filter((r) => r.status === 'converted').length
  const totalCommission = list.reduce(
    (acc, r) => acc + Number(r.commission_paid ?? 0),
    0
  )

  // Commissions pending = referral payment rows status=pending
  const { data: payments } = await sb
    .from('jurispurama_payments')
    .select('amount, status, stripe_payment_id')
    .eq('user_id', jurisUserId)
    .like('stripe_payment_id', 'referral_%')
  const pendingCommission = (payments ?? [])
    .filter((p) => p.status === 'pending')
    .reduce((acc, p) => acc + Number(p.amount ?? 0), 0)
  const paidCommission = (payments ?? [])
    .filter((p) => p.status === 'succeeded' || p.status === 'paid')
    .reduce((acc, p) => acc + Number(p.amount ?? 0), 0)

  const { current, next, progressPct } = computeTier(totalConversions)

  return {
    code: user?.referral_code ?? null,
    totalClicks: totalSignups, // we don't track raw clicks yet, proxy = signups
    totalSignups,
    totalConversions,
    pendingCommission,
    paidCommission,
    totalCommission,
    tier: current,
    nextTier: next,
    progressPct,
    recentReferrals: list.slice(0, 10),
  }
}
