/**
 * CRON — Suppression effective des comptes (RGPD art. 17). Quotidien, 03:00 UTC.
 *
 * Lit `account_deletion_requests` dont `scheduled_for` ≤ now() et `status='scheduled'`.
 * Pour chaque ligne : marque 'executing' → `auth.admin.deleteUser(user_id)` → marque
 * 'completed'. L'effacement des lignes métier dépend des cascades effectivement définies
 * dans le schéma déployé. Cet exécuteur ne vérifie pas l'effacement des objets de stockage,
 * des sauvegardes ni des données conservées par les sous-traitants.
 * Une erreur de prise en charge empêche l'appel de suppression ; une demande encore
 * 'scheduled' reste éligible au passage suivant. Une demande laissée à 'executing'
 * nécessite une investigation manuelle, sans retry automatique (cf
 * PIEGES.md "RGPD suppression qui ne supprime rien", ne jamais renvoyer {success:true} sans
 * DELETE réel).
 */
import { type NextRequest, NextResponse } from 'next/server'
import { assertCronAuth } from '@/lib/cron-auth'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DeletionRow {
  id: string
  user_id: string
  scheduled_for: string
}

export async function GET(request: NextRequest) {
  return run(request)
}
export async function POST(request: NextRequest) {
  return run(request)
}

async function run(request: NextRequest) {
  const authError = assertCronAuth(request)
  if (authError) return authError

  const service = createServiceClient()
  const startedAt = Date.now()
  const now = new Date().toISOString()

  const { data: requests, error: rErr } = await service
    .from('account_deletion_requests')
    .select('id, user_id, scheduled_for')
    .eq('status', 'scheduled')
    .lte('scheduled_for', now)
    .limit(100)
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const list = (requests ?? []) as DeletionRow[]
  if (list.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, note: 'no deletion request due' })
  }

  const results: Array<{ id: string; user_id: string; ok: boolean; error?: string }> = []

  for (const req of list) {
    try {
      const { error: claimErr } = await service
        .from('account_deletion_requests')
        .update({ status: 'executing' })
        .eq('id', req.id)
      if (claimErr) throw claimErr

      const { error: authErr } = await service.auth.admin.deleteUser(req.user_id)
      if (authErr) throw authErr

      const { error: completionErr } = await service
        .from('account_deletion_requests')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', req.id)
      if (completionErr) throw completionErr

      results.push({ id: req.id, user_id: req.user_id, ok: true })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string'
            ? err.message
            : String(err)
      results.push({ id: req.id, user_id: req.user_id, ok: false, error: message })
    }
  }

  const failed = results.filter((r) => !r.ok).length
  return NextResponse.json(
    {
      ok: failed === 0,
      processed: results.length,
      succeeded: results.filter((r) => r.ok).length,
      failed,
      results,
      runMs: Date.now() - startedAt,
    },
    { status: failed === 0 ? 200 : 500 }
  )
}
