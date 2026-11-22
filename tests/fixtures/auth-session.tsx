import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { JurisUser } from '../../src/types'
import { useAuth } from '../../src/hooks/useAuth'

type FixtureError = { code?: string; message: string }
type SessionResponse = { data: { session: Session | null }; error: FixtureError | null }
type ProfileResponse = { data: JurisUser | null; error: FixtureError | null }
type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void | Promise<void>

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}

function createTransport() {
  const initialReads: ReturnType<typeof deferred<SessionResponse>>[] = []
  const profileReads: (ReturnType<typeof deferred<ProfileResponse>> & {
    table: string
    kind: 'read' | 'insert'
    userId: string | null
    insideAuthCallback: boolean
  })[] = []
  const callbacks = new Map<number, AuthCallback>()
  const emittedPromises: boolean[] = []
  let subscriptions = 0, unsubscriptions = 0, insideAuthCallback = false

  const client = {
    auth: {
      getSession() {
        const read = deferred<SessionResponse>()
        initialReads.push(read)
        return read.promise
      },
      onAuthStateChange(callback: AuthCallback) {
        const id = ++subscriptions
        callbacks.set(id, callback)
        return { data: { subscription: { unsubscribe() {
          if (callbacks.delete(id)) unsubscriptions++
        } } } }
      },
    },
    from(table: string) {
      let kind: 'read' | 'insert' = 'read', userId: string | null = null
      const startedInsideAuthCallback = insideAuthCallback
      const query = {
        select() { return query },
        eq(field: string, value: string) {
          if (field !== 'auth_user_id') throw new Error(`Unexpected profile filter: ${field}`)
          userId = value
          return query
        },
        insert(value: { auth_user_id: string }) {
          kind = 'insert'; userId = value.auth_user_id
          return query
        },
        maybeSingle() {
          const read = deferred<ProfileResponse>()
          profileReads.push({ ...read, table, kind, userId, insideAuthCallback: startedInsideAuthCallback })
          return read.promise
        },
      }
      return query
    },
  }

  return {
    client,
    emit(event: AuthChangeEvent, session: Session | null) {
      insideAuthCallback = true
      try {
        for (const callback of [...callbacks.values()]) {
          const result = callback(event, session)
          emittedPromises.push(Boolean(result && typeof result.then === 'function'))
        }
      } finally { insideAuthCallback = false }
    },
    resolveInitial(session: Session | null) {
      for (const read of initialReads) read.resolve({ data: { session }, error: null })
    },
    resolveProfile(index: number, profile: JurisUser | null) {
      const read = profileReads[index]
      if (!read) throw new Error(`Missing profile request ${index}`)
      read.resolve({ data: profile, error: null })
    },
    stats() {
      return {
        subscriptions, unsubscriptions, activeSubscriptions: callbacks.size,
        initialReads: initialReads.length,
        profileReads: profileReads.map(({ table, kind, userId, insideAuthCallback }) => ({
          table, kind, userId, insideAuthCallback,
        })),
        emittedPromises: [...emittedPromises],
      }
    },
  }
}

declare global {
  interface Window {
    authSessionDriver: ReturnType<typeof createTransport>
  }
}

function SessionState() {
  const auth = useAuth()
  return <section aria-label="Session de test">
    <p data-testid="auth-user">{auth.user?.id ?? 'aucun'}</p>
    <p data-testid="auth-profile">{auth.profile?.auth_user_id ?? 'aucun'}</p>
    <p data-testid="auth-token">{auth.session?.access_token ?? 'aucun'}</p>
    <p role="status">{auth.loading ? 'Chargement' : 'Prêt'}</p>
  </section>
}

function Fixture() {
  const [renders, setRenders] = useState(0)
  const [open, setOpen] = useState(true)
  return <>
    <button onClick={() => setRenders(value => value + 1)}>Actualiser le cadre</button>
    <button onClick={() => setOpen(false)}>Quitter la session</button>
    <p data-testid="frame-renders">{renders}</p>
    {open ? <SessionState /> : <p>Session démontée</p>}
  </>
}

// Real React scheduling and the real hook. The esbuild plugin replaces only
// the Supabase client boundary; this fixture does not claim a real SDK lock test.
window.authSessionDriver = createTransport()
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>)
