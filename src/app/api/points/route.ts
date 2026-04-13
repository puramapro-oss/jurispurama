import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

// GET — points balance + recent transactions + daily gift status
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour voir tes points.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id, purama_points')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const { data: transactions } = await supabase
    .from('jurispurama_point_transactions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(30)

  // Check daily gift
  const today = new Date().toISOString().slice(0, 10)
  const { data: todayGift } = await supabase
    .from('jurispurama_daily_gifts')
    .select('id, gift_type, gift_value, streak_count')
    .eq('user_id', profile.id)
    .gte('opened_at', `${today}T00:00:00`)
    .limit(1)

  return NextResponse.json({
    points: profile.purama_points ?? 0,
    transactions: transactions ?? [],
    dailyGiftClaimed: (todayGift?.length ?? 0) > 0,
    lastGift: todayGift?.[0] ?? null,
  })
}

// POST — claim daily gift
export async function POST() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour ouvrir ton cadeau.' },
      { status: 401 }
    )
  }

  const svc = createServiceClient()

  const { data: profile } = await svc
    .from('jurispurama_users')
    .select('id, purama_points')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  // Check already claimed today
  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await svc
    .from('jurispurama_daily_gifts')
    .select('id')
    .eq('user_id', profile.id)
    .gte('opened_at', `${today}T00:00:00`)
    .limit(1)
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'Tu as déjà ouvert ton cadeau aujourd\'hui !' },
      { status: 400 }
    )
  }

  // Calculate streak
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const { data: yesterdayGift } = await svc
    .from('jurispurama_daily_gifts')
    .select('streak_count')
    .eq('user_id', profile.id)
    .gte('opened_at', `${yesterday}T00:00:00`)
    .lt('opened_at', `${today}T00:00:00`)
    .limit(1)
  const streak = (yesterdayGift?.[0]?.streak_count ?? 0) + 1

  // Roll gift (weighted random)
  const roll = Math.random() * 100
  let giftType: string
  let giftValue: string
  let pointsEarned = 0

  if (roll < 40) {
    pointsEarned = Math.floor(Math.random() * 16) + 5 // 5–20
    if (streak >= 7) pointsEarned = Math.max(pointsEarned, 10)
    giftType = 'points'
    giftValue = `${pointsEarned}`
  } else if (roll < 65) {
    const discount = streak >= 7 ? 10 : 5
    giftType = 'coupon'
    giftValue = `-${discount}%`
  } else if (roll < 80) {
    giftType = 'ticket'
    giftValue = '1'
  } else if (roll < 90) {
    pointsEarned = 3
    giftType = 'credits'
    giftValue = '3'
  } else if (roll < 95) {
    pointsEarned = Math.floor(Math.random() * 51) + 50 // 50–100
    giftType = 'bonus_points'
    giftValue = `${pointsEarned}`
  } else {
    giftType = 'mega_coupon'
    giftValue = '-50%'
  }

  // Save gift
  await svc.from('jurispurama_daily_gifts').insert({
    user_id: profile.id,
    gift_type: giftType,
    gift_value: giftValue,
    streak_count: streak,
  })

  // Credit points if applicable
  if (pointsEarned > 0) {
    await svc.from('jurispurama_point_transactions').insert({
      user_id: profile.id,
      amount: pointsEarned,
      type: 'earn',
      source: 'daily_gift',
      description: `Cadeau quotidien (jour ${streak})`,
    })
    await svc
      .from('jurispurama_users')
      .update({
        purama_points: (profile.purama_points ?? 0) + pointsEarned,
      })
      .eq('id', profile.id)
  }

  return NextResponse.json({
    gift: { type: giftType, value: giftValue, streak },
    pointsEarned,
  })
}
