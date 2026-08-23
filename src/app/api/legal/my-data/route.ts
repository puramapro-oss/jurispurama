/**
 * GET /api/legal/my-data — export complet des données personnelles au format JSON
 * (droit à la portabilité, art. 20 RGPD ; page « Ma mémoire »). RÉELLEMENT lit les tables,
 * jamais un stub `{success:true}` (cf PIEGES.md "export/RGPD absent malgré CLAUDE.md").
 *
 * Spécificité JurisPurama : `jurispurama_users.id` (profil interne) est DIFFÉRENT de
 * `auth.users.id` — toutes les tables métier (`jurispurama_legal_profiles`,
 * `jurispurama_cases`, `jurispurama_payments`, `jurispurama_referrals`) référencent le
 * profil interne, pas l'id auth directement. On résout donc le profil d'abord, puis on
 * l'utilise pour les tables filtrées, et les dossiers pour remonter messages/documents
 * (liés à `case_id`, pas directement à l'utilisateur). RLS (`auth.uid()` via jointure)
 * protège chaque requête en plus de ce filtrage explicite.
 */
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const [{ data: profile }, { data: acceptances }, { data: cookieConsent }] = await Promise.all([
    supabase.from('jurispurama_users').select('*').eq('auth_user_id', user.id).maybeSingle(),
    supabase.from('legal_acceptances').select('doc_type, version, accepted_at').eq('user_id', user.id),
    supabase.from('cookie_consents').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const profileId = profile?.id as string | undefined

  const [{ data: legalProfile }, { data: cases }, { data: payments }, { data: referrals }] = profileId
    ? await Promise.all([
        supabase.from('jurispurama_legal_profiles').select('*').eq('user_id', profileId).maybeSingle(),
        supabase.from('jurispurama_cases').select('*').eq('user_id', profileId),
        supabase.from('jurispurama_payments').select('*').eq('user_id', profileId),
        supabase.from('jurispurama_referrals').select('*').or(`referrer_id.eq.${profileId},referred_id.eq.${profileId}`),
      ])
    : [{ data: null }, { data: [] }, { data: [] }, { data: [] }]

  const caseIds = (cases ?? []).map((c: { id: string }) => c.id)
  const [{ data: messages }, { data: documents }] =
    caseIds.length > 0
      ? await Promise.all([
          supabase.from('jurispurama_messages').select('*').in('case_id', caseIds),
          supabase.from('jurispurama_documents').select('*').in('case_id', caseIds),
        ])
      : [{ data: [] }, { data: [] }]

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    compte: { id: user.id, email: user.email, createdAt: user.created_at },
    profil: profile ?? null,
    profilJuridique: legalProfile ?? null,
    dossiers: cases ?? [],
    messages: messages ?? [],
    documents: documents ?? [],
    paiements: payments ?? [],
    parrainages: referrals ?? [],
    acceptationsLegales: acceptances ?? [],
    consentementCookies: cookieConsent ?? null,
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="mes-donnees.json"',
    },
  })
}
