import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function notificationFailure() {
  return NextResponse.json({ error: 'Impossible de traiter les notifications. Réessaie.' }, { status: 500 })
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const { data: juriUser, error: profileError } = await supabase
      .from('jurispurama_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (profileError) return notificationFailure()

    if (!juriUser) {
      return NextResponse.json({ notifications: [], unread: 0 })
    }

    const admin = createServiceClient()
    const { data: rows, error: listError } = await admin
      .from('jurispurama_notifications')
      .select('id, type, title, message, link, read_at, created_at')
      .eq('user_id', juriUser.id)
      .order('created_at', { ascending: false })
      .limit(25)
    if (listError) return notificationFailure()

    const notifications = rows ?? []
    const unread = notifications.filter((n) => n.read_at == null).length

    return NextResponse.json({ notifications, unread })
  } catch {
    return notificationFailure()
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).max(100).optional(),
  allRead: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
    }

    const { data: juriUser, error: profileError } = await supabase
      .from('jurispurama_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
    if (profileError) return notificationFailure()
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
      const { error } = await admin
        .from('jurispurama_notifications')
        .update({ read_at: nowIso })
        .eq('user_id', juriUser.id)
        .is('read_at', null)
      if (error) return notificationFailure()
    } else if (body.ids && body.ids.length > 0) {
      const { error } = await admin
        .from('jurispurama_notifications')
        .update({ read_at: nowIso })
        .in('id', body.ids)
        .eq('user_id', juriUser.id)
      if (error) return notificationFailure()
    }

    return NextResponse.json({ ok: true })
  } catch {
    return notificationFailure()
  }
}
