import { createClient } from '@supabase/supabase-js'

// Keep a password update bound to its verified account, without replacing the
// browser's shared session if another tab signs in while the request is pending.
export function createPasswordUpdateClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: 'jurispurama-password-update',
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}
