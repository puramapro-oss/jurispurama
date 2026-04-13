import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour accéder à ton wallet.' },
      { status: 401 }
    )
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id, wallet_balance, purama_points')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const { data: transactions } = await supabase
    .from('jurispurama_wallet_transactions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: withdrawals } = await supabase
    .from('jurispurama_withdrawals')
    .select('*')
    .eq('user_id', profile.id)
    .order('requested_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    balance: Number(profile.wallet_balance ?? 0),
    points: profile.purama_points ?? 0,
    transactions: transactions ?? [],
    withdrawals: withdrawals ?? [],
  })
}

const withdrawalSchema = z.object({
  amount: z.number().min(5, 'Le montant minimum de retrait est de 5 €.'),
  iban: z
    .string()
    .min(15, 'IBAN invalide.')
    .max(34, 'IBAN invalide.')
    .regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/, 'Format IBAN invalide.'),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour effectuer un retrait.' },
      { status: 401 }
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = withdrawalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Données invalides.' },
      { status: 400 }
    )
  }

  const svc = createServiceClient()

  const { data: profile } = await svc
    .from('jurispurama_users')
    .select('id, wallet_balance')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const balance = Number(profile.wallet_balance ?? 0)
  if (parsed.data.amount > balance) {
    return NextResponse.json(
      {
        error: `Solde insuffisant. Tu as ${balance.toFixed(2)} € disponibles.`,
      },
      { status: 400 }
    )
  }

  // Check pending withdrawal
  const { data: pending } = await svc
    .from('jurispurama_withdrawals')
    .select('id')
    .eq('user_id', profile.id)
    .in('status', ['pending', 'processing'])
    .limit(1)
  if (pending && pending.length > 0) {
    return NextResponse.json(
      { error: 'Un retrait est déjà en cours. Attends son traitement.' },
      { status: 400 }
    )
  }

  // Create withdrawal + debit
  const { error: wErr } = await svc
    .from('jurispurama_withdrawals')
    .insert({
      user_id: profile.id,
      amount: parsed.data.amount,
      iban: parsed.data.iban.replace(/\s/g, '').toUpperCase(),
    })
  if (wErr) {
    return NextResponse.json(
      { error: 'Erreur lors de la demande de retrait. Réessaie.' },
      { status: 500 }
    )
  }

  // Debit wallet
  await svc
    .from('jurispurama_wallet_transactions')
    .insert({
      user_id: profile.id,
      amount: -parsed.data.amount,
      type: 'withdrawal',
      source: 'withdrawal',
      description: `Retrait de ${parsed.data.amount.toFixed(2)} € vers IBAN`,
    })

  // Update balance
  await svc
    .from('jurispurama_users')
    .update({ wallet_balance: balance - parsed.data.amount })
    .eq('id', profile.id)

  return NextResponse.json({ success: true })
}
