import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!juriUser) {
    return NextResponse.json({ notifications: [], unread: 0 })
  }

  const admin = createServiceClient()
  const { data: rows } = await admin
    .from('jurispurama_notifications')
    .select('id, type, title, message, link, read_at, created_at')
    .eq('user_id', juriUser.id)
    .order('created_at', { ascending: false })
    .limit(25)

  const notifications = rows ?? []
  const unread = notifications.filter((n) => n.read_at == null).length

  return NextResponse.json({ notifications, unread })
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  allRead: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!juriUser) {
    return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
  }

  let body: z.infer<typeof patchSchema>
  try {
    const json = await req.json()
    body = patchSchema.parse(json)
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  }

  const admin = createServiceClient()
  const nowIso = new Date().toISOString()

  if (body.allRead) {
    await admin
      .from('jurispurama_notifications')
      .update({ read_at: nowIso })
      .eq('user_id', juriUser.id)
      .is('read_at', null)
  } else if (body.ids && body.ids.length > 0) {
    await admin
      .from('jurispurama_notifications')
      .update({ read_at: nowIso })
      .in('id', body.ids)
      .eq('user_id', juriUser.id)
  }

  return NextResponse.json({ ok: true })
}
