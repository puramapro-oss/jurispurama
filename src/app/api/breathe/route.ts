import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const schema = z.object({
  duration: z.number().min(1).max(3600),
  technique: z.string().min(1).max(50),
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
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
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

  await svc.from('jurispurama_breath_sessions').insert({
    user_id: profile.id,
    duration_seconds: parsed.data.duration,
    technique: parsed.data.technique,
  })

  return NextResponse.json({ success: true })
}
