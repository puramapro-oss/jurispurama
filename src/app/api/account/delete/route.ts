/**
 * POST /api/account/delete   — programme la suppression du compte dans 30 jours (RGPD art. 17).
 * DELETE /api/account/delete — annule une demande de suppression en cours (période de grâce).
 *
 * Adapté du socle `packages/legal/src/api/account-delete.ts`.
 * Le complément du 11 novembre 2026 conditionne les changements d'une demande existante
 * à l'état relu : une prise en charge du cron ou une annulation concurrente n'est pas écrasée.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { rateLimit } from '@/lib/rate-limit'

const GRACE_PERIOD_DAYS = 30

const requestSchema = z.object({
  reason: z.string().max(500).optional(),
  confirm: z.literal('DELETE_MY_ACCOUNT'),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const rate = await rateLimit(`account-delete:${user.id}`, 5, 60)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Trop de demandes, réessaie dans une minute.' }, { status: 429 })
  }

  const json = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Confirmation invalide. Tape 'DELETE_MY_ACCOUNT' pour confirmer." }, { status: 400 })
  }

  const scheduledFor = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 3600 * 1000)
  const { data: existing, error: lookupError } = await supabase
    .from('account_deletion_requests')
    .select('id, user_id, status, scheduled_for')
    .eq('user_id', user.id)
    .maybeSingle()
  if (lookupError) {
    console.error('[account/delete] lookup failed', { code: lookupError.code })
    return NextResponse.json({ error: 'Demande impossible.' }, { status: 500 })
  }
  if (existing !== null && (
    !existing || typeof existing.id !== 'string' || !existing.id || existing.user_id !== user.id ||
    typeof existing.scheduled_for !== 'string' || !Number.isFinite(Date.parse(existing.scheduled_for))
  )) {
    return NextResponse.json({ error: 'État de la demande non confirmé. Actualise la page.' }, { status: 500 })
  }
  if (existing && existing.status !== 'scheduled' && existing.status !== 'cancelled') {
    return NextResponse.json({ error: 'Cette demande ne peut plus être reprogrammée. Contacte le support pour vérifier son état.' }, { status: 409 })
  }

  const payload = {
    user_id: user.id,
    scheduled_for: scheduledFor.toISOString(),
    reason: parsed.data.reason ?? null,
    status: 'scheduled',
    cancelled_at: null,
    completed_at: null,
  }
  const mutation = existing
    ? supabase.from('account_deletion_requests')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', user.id)
      .eq('status', existing.status)
      .eq('scheduled_for', existing.scheduled_for)
    : supabase.from('account_deletion_requests').insert(payload)
  const { data: scheduled, error } = await mutation.select('id, user_id, status, scheduled_for').maybeSingle()

  if (error?.code === '23505' || (!error && scheduled === null)) {
    return NextResponse.json({ error: 'La demande a changé pendant cette opération. Actualise la page pour vérifier son état.' }, { status: 409 })
  }

  if (error) {
    console.error('[account/delete] scheduling failed', { code: error.code })
    return NextResponse.json({ error: 'Demande impossible.' }, { status: 500 })
  }
  if (!scheduled || typeof scheduled.id !== 'string' || !scheduled.id || scheduled.user_id !== user.id ||
    scheduled.status !== 'scheduled' || typeof scheduled.scheduled_for !== 'string' ||
    Date.parse(scheduled.scheduled_for) !== scheduledFor.getTime()) {
    return NextResponse.json({ error: 'Programmation non confirmée. Actualise la page pour vérifier son état.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, scheduled_for: scheduledFor.toISOString(), grace_period_days: GRACE_PERIOD_DAYS })
}

export async function DELETE(_req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const rate = await rateLimit(`account-delete-cancel:${user.id}`, 5, 60)
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Trop de demandes, réessaie dans une minute.' }, { status: 429 })
  }

  const { data: cancelled, error } = await supabase
    .from('account_deletion_requests')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[account/delete] cancellation failed', { code: error.code })
    return NextResponse.json({ error: 'Annulation impossible.' }, { status: 500 })
  }
  if (cancelled === null) {
    return NextResponse.json(
      { error: "Aucune demande en attente n'a été annulée. Actualise la page pour vérifier son état." },
      { status: 409 }
    )
  }
  if (!cancelled || typeof cancelled.id !== 'string' || cancelled.id.length === 0) {
    return NextResponse.json({ error: 'Annulation non confirmée. Actualise la page pour vérifier son état.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
