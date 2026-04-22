import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Auth requise' }, { status: 401 })

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })

  // Agrégation live
  const [casesRes, docsRes, impactRes, sigsRes] = await Promise.all([
    admin
      .from('jurispurama_cases')
      .select('id, status, money_saved', { count: 'exact' })
      .eq('user_id', profile.id),
    admin
      .from('jurispurama_documents')
      .select('id', { count: 'exact', head: true })
      .eq('deleted_at', null as unknown as string)
      .in(
        'case_id',
        (
          await admin
            .from('jurispurama_cases')
            .select('id')
            .eq('user_id', profile.id)
        ).data?.map((c) => c.id) ?? []
      ),
    admin
      .from('jurispurama_user_impact')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle(),
    admin
      .from('jurispurama_documents')
      .select('id, sent_status')
      .in(
        'case_id',
        (
          await admin
            .from('jurispurama_cases')
            .select('id')
            .eq('user_id', profile.id)
        ).data?.map((c) => c.id) ?? []
      ),
  ])

  const cases = casesRes.data ?? []
  const resolved = cases.filter((c) => c.status === 'resolu').length
  const moneySaved = cases.reduce((acc, c) => acc + Number(c.money_saved ?? 0), 0)
  const docsCount = docsRes.count ?? 0
  const recommandeCount = (sigsRes.data ?? []).filter(
    (d) => d.sent_status === 'sent_recommande'
  ).length
  // Heures avocat évitées : estimation (1 dossier résolu ~ 2h avocat)
  const legalHoursSaved = resolved * 2

  // Upsert aggregated
  await admin
    .from('jurispurama_user_impact')
    .upsert(
      {
        user_id: profile.id,
        cases_resolved: resolved,
        money_saved_eur: moneySaved,
        legal_hours_saved: legalHoursSaved,
        documents_generated: docsCount,
        recommande_sent: recommandeCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  // Impact planétaire estimé :
  // 1 recommandé AR24 électronique = ~20g CO2 évités vs papier (estim La Poste)
  // 1 document PDF + signature élec = 50g CO2 évités vs impression+envoi
  const co2KgSaved = Math.round((recommandeCount * 20 + docsCount * 50) / 1000)
  // 1 dossier résolu sans avocat = arbre équivalent (estim empreinte déplacement)
  const treeEquivalent = Math.round(resolved / 3)

  return NextResponse.json({
    cases_resolved: resolved,
    money_saved_eur: moneySaved,
    legal_hours_saved: legalHoursSaved,
    documents_generated: docsCount,
    recommande_sent: recommandeCount,
    co2_kg_saved: co2KgSaved,
    tree_equivalent: treeEquivalent,
    impact_data: impactRes.data ?? null,
  })
}
