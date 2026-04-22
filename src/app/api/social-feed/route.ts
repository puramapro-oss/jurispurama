import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/social-feed — 20 derniers événements communauté (sans montants exacts)
 */
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Auth requise' }, { status: 401 })

  const admin = createServiceClient()
  const { data: events } = await admin
    .from('jurispurama_social_feed_events')
    .select('id, event_type, display_first_name, display_message, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ events: events ?? [] })
}
