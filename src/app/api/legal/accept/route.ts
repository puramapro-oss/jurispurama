/**
 * POST /api/legal/accept — enregistre une preuve d'acceptation horodatée (qui/quelle
 * version/quand — NIYAMA-BRIEF.md §1) d'un document légal (CGU, CGV ou politique de
 * confidentialité). Appelé automatiquement à la création de compte (acceptation de la
 * version courante) et par `LegalReacceptanceGate` quand une version change.
 *
 * La version enregistrée est TOUJOURS `CURRENT_LEGAL_VERSIONS[docType]` calculée côté
 * serveur — jamais une valeur envoyée par le client. Un client ne peut pas falsifier la
 * preuve en prétendant avoir accepté une version qu'il n'a jamais vue.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { CURRENT_LEGAL_VERSIONS } from '@/lib/legal/versions'

const docTypeSchema = z.enum(['mentions', 'cgu', 'cgv', 'confidentialite'])

// Accepte un seul `docType` (rappelé par `LegalReacceptanceGate` document par document)
// ou plusieurs `docTypes` d'un coup (signup : les 4 documents acceptés en 1 requête).
const bodySchema = z.union([
  z.object({ docType: docTypeSchema }),
  z.object({ docTypes: z.array(docTypeSchema).min(1) }),
])

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const docTypes = 'docType' in parsed.data ? [parsed.data.docType] : parsed.data.docTypes
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent')
  const acceptedAt = new Date().toISOString()

  const { error } = await supabase.from('legal_acceptances').upsert(
    docTypes.map((docType) => ({
      user_id: user.id,
      doc_type: docType,
      version: CURRENT_LEGAL_VERSIONS[docType],
      ip,
      user_agent: userAgent,
      accepted_at: acceptedAt,
    })),
    { onConflict: 'user_id,doc_type' }
  )

  if (error) {
    return NextResponse.json({ error: 'Enregistrement impossible.', debug: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
