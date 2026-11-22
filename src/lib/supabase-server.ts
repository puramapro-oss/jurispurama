import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { APP_SCHEMA } from './constants'

// Server client — used in Server Components and API Routes
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — cookies are read-only
          }
        },
      },
      db: { schema: APP_SCHEMA },
    }
  )
}

// Native clients send a user access token; browser routes keep their cookie session.
// An explicit but invalid Authorization header must never fall back to another user.
export async function createRequestSupabaseClient(request: Request) {
  const authorization = request.headers.get('authorization')
  if (authorization === null) {
    return { client: await createServerSupabaseClient(), accessToken: undefined }
  }
  const bearer = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(authorization)
  if (!bearer) return null

  const accessToken = bearer[1]
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      db: { schema: APP_SCHEMA },
    }
  )
  return { client, accessToken }
}
