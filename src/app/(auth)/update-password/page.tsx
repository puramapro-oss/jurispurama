'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { createClient } from '@/lib/supabase'
import { createPasswordUpdateClient } from '@/lib/password-update-client'
import {
  matchesRecoverySession,
  recoveryIdentity,
  RecoverySessionChangedError,
  updateRecoveryPassword,
  validatedRecoverySession,
  type RecoveryIdentity,
} from '@/lib/password-recovery'

const INVALID_SESSION = 'Le lien est invalide ou a expiré. Demande un nouveau lien de réinitialisation.'
const CHANGED_SESSION = 'La session a changé. Demande un nouveau lien pour le compte concerné.'

export default function UpdatePasswordPage() {
  const [supabase] = useState(createClient)
  const [identity, setIdentity] = useState<RecoveryIdentity | null>(null)
  const [checking, setChecking] = useState(true)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const identityRef = useRef<RecoveryIdentity | null>(null)
  const ownerRef = useRef<string | null>(null)
  const blockedRef = useRef(false)
  const requestRef = useRef<symbol | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    let active = true
    let observedAuthEvent = false
    let revision = 0
    mountedRef.current = true

    const invalidate = (message: string) => {
      requestRef.current = null
      identityRef.current = null
      setIdentity(null)
      setChecking(false)
      setBusy(false)
      setSuccess(false)
      setPassword('')
      setConfirmation('')
      setError(message)
    }

    const inspect = (session: Session | null) => {
      const currentRevision = ++revision
      if (blockedRef.current) return
      if (!session) {
        if (ownerRef.current) blockedRef.current = true
        invalidate(INVALID_SESSION)
        return
      }
      if (ownerRef.current && ownerRef.current !== session.user.id) {
        blockedRef.current = true
        invalidate(CHANGED_SESSION)
        return
      }
      ownerRef.current = session.user.id
      if (identityRef.current && matchesRecoverySession(session, identityRef.current)) return
      requestRef.current = null
      identityRef.current = null
      setIdentity(null)
      setChecking(true)
      setBusy(false)
      const expected = recoveryIdentity(session)
      const isCurrent = () => active && !blockedRef.current && revision === currentRevision
      // Auth callbacks return synchronously; SDK calls run outside its auth lock.
      queueMicrotask(async () => {
        try {
          await validatedRecoverySession(supabase, expected, isCurrent)
          if (!isCurrent()) return
          identityRef.current = expected
          setIdentity(expected)
          setError(null)
          setChecking(false)
        } catch {
          if (isCurrent()) invalidate(INVALID_SESSION)
        }
      })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      observedAuthEvent = true
      inspect(session)
    })
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (active && !observedAuthEvent) inspect(sessionError ? null : data.session)
    }).catch(() => {
      if (active && !observedAuthEvent) invalidate(INVALID_SESSION)
    })

    return () => {
      active = false
      mountedRef.current = false
      requestRef.current = null
      identityRef.current = null
      subscription.unsubscribe()
    }
  }, [supabase])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const expected = identityRef.current
    if (!expected || requestRef.current || blockedRef.current || success) return
    if (password.length < 8) {
      setError('Choisis un mot de passe d’au moins 8 caractères.')
      return
    }
    if (password !== confirmation) {
      setError('Les deux mots de passe doivent être identiques.')
      return
    }
    const request = Symbol('password-update')
    requestRef.current = request
    setBusy(true)
    setError(null)
    const isCurrent = () => mountedRef.current && requestRef.current === request &&
      identityRef.current === expected && !blockedRef.current
    try {
      await updateRecoveryPassword(supabase, createPasswordUpdateClient, password, expected, isCurrent)
      if (!isCurrent()) return
      setSuccess(true)
      setPassword('')
      setConfirmation('')
    } catch (failure) {
      if (isCurrent()) {
        if (failure instanceof RecoverySessionChangedError) {
          blockedRef.current = true
          identityRef.current = null
          setIdentity(null)
          setPassword('')
          setConfirmation('')
          setError(CHANGED_SESSION)
        } else {
          setError('Modification impossible. Vérifie ta connexion et choisis un mot de passe plus fort avant de réessayer.')
        }
      }
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null
        if (mountedRef.current) setBusy(false)
      }
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-3xl p-8 md:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-[var(--justice)]">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Choisis un mot de passe pour sécuriser ton compte.</p>
        </div>
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        {checking ? (
          <p role="status" className="text-center text-sm text-[var(--text-secondary)]">Vérification du lien…</p>
        ) : success ? (
          <div className="text-center">
            <p role="status" className="mb-6 text-sm text-[var(--text-secondary)]">Ton mot de passe a été modifié.</p>
            <Link href="/dashboard" className="text-sm font-medium text-[var(--justice)] hover:underline">Retrouver mes dossiers</Link>
          </div>
        ) : identity ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" aria-busy={busy}>
            <Input id="new-password" label="Nouveau mot de passe" type="password" autoComplete="new-password"
              minLength={8} value={password} onChange={event => setPassword(event.target.value)}
              hint="Au moins 8 caractères." required disabled={busy} />
            <Input id="confirm-password" label="Confirmer le mot de passe" type="password" autoComplete="new-password"
              minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)}
              required disabled={busy} />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={busy}
              disabled={!password || !confirmation}>Enregistrer le mot de passe</Button>
          </form>
        ) : (
          <Link href="/forgot-password" className="text-sm font-medium text-[var(--justice)] hover:underline">Demander un nouveau lien</Link>
        )}
      </div>
    </div>
  )
}
