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
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  const { data: entries } = await supabase
    .from('jurispurama_gratitude_entries')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ entries: entries ?? [] })
}

const schema = z.object({
  content: z.string().min(1, 'Écris au moins un mot.').max(500),
})

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalide.' },
      { status: 400 }
    )
  }

  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!profile) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  await svc.from('jurispurama_gratitude_entries').insert({
    user_id: profile.id,
    content: parsed.data.content,
  })

  return NextResponse.json({ success: true })
}
