import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { APP_NAME } from '@/lib/constants'
import MaMemoirePage from '@/lib/legal/components/MaMemoirePage'

export const metadata: Metadata = {
  title: `Ma mémoire — ${APP_NAME}`,
  description: `Consulte, exporte ou efface les données que ${APP_NAME} conserve à ton sujet.`,
}

export default async function MaMemoireRoute() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?next=/settings/ma-memoire')

  const [{ data: acceptances }, { data: deletionRequest }] = await Promise.all([
    supabase
      .from('legal_acceptances')
      .select('doc_type, version, accepted_at')
      .eq('user_id', user.id),
    supabase
      .from('account_deletion_requests')
      .select('scheduled_for')
      .eq('user_id', user.id)
      .eq('status', 'scheduled')
      .maybeSingle(),
  ])

  return (
    <MaMemoirePage
      appName={APP_NAME}
      acceptations={(acceptances ?? []).map((a) => ({
        docType: a.doc_type,
        version: a.version,
        acceptedAt: a.accepted_at,
      }))}
      deletionScheduledFor={deletionRequest?.scheduled_for ?? null}
    />
  )
}
