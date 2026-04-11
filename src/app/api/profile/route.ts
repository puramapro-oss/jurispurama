import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import {
  legalProfileSchema,
  ENCRYPTED_FIELDS,
  type LegalProfileInput,
} from '@/lib/profile-schema'
import { decryptString, encryptString } from '@/lib/encryption'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function loadAuth() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { supabase, user: null, profile: null as null | { id: string } }
  }
  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  return { supabase, user, profile }
}

type RawProfile = Record<string, unknown>

function decryptProfile(raw: RawProfile): RawProfile {
  const out: RawProfile = { ...raw }
  for (const field of ENCRYPTED_FIELDS) {
    const v = out[field]
    if (typeof v === 'string') {
      out[field] = decryptString(v)
    }
  }
  return out
}

function encryptProfile(
  input: LegalProfileInput
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input }
  for (const field of ENCRYPTED_FIELDS) {
    const v = out[field]
    if (typeof v === 'string' && v.length > 0) {
      out[field] = encryptString(v)
    } else {
      out[field] = null
    }
  }
  return out
}

export async function GET() {
  const { user, profile } = await loadAuth()
  if (!user || !profile) {
    return NextResponse.json(
      { error: 'Non authentifié.' },
      { status: 401 }
    )
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('jurispurama_legal_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: 'Impossible de charger ton profil juridique.' },
      { status: 500 }
    )
  }

  if (!data) return NextResponse.json({ profile: {} })

  const decrypted = decryptProfile(data as RawProfile)
  return NextResponse.json({ profile: decrypted })
}

export async function PUT(req: NextRequest) {
  const { user, profile } = await loadAuth()
  if (!user || !profile) {
    return NextResponse.json(
      { error: 'Non authentifié.' },
      { status: 401 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Requête invalide — JSON attendu.' },
      { status: 400 }
    )
  }

  const parsed = legalProfileSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return NextResponse.json(
      {
        error: `Champ invalide : ${first.path.join('.')} — ${first.message}`,
        issues: parsed.error.issues,
      },
      { status: 422 }
    )
  }

  const encrypted = encryptProfile(parsed.data)

  const supabase = await createServerSupabaseClient()
  const { data: existing } = await supabase
    .from('jurispurama_legal_profiles')
    .select('id')
    .eq('user_id', profile.id)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('jurispurama_legal_profiles')
      .update({ ...encrypted, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) {
      return NextResponse.json(
        {
          error:
            'Impossible de mettre à jour le profil. Vérifie les champs et réessaie.',
        },
        { status: 500 }
      )
    }
  } else {
    const { error } = await supabase
      .from('jurispurama_legal_profiles')
      .insert({
        user_id: profile.id,
        ...encrypted,
      })
    if (error) {
      return NextResponse.json(
        {
          error:
            'Impossible de créer le profil. Vérifie les champs et réessaie.',
        },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ ok: true })
}
