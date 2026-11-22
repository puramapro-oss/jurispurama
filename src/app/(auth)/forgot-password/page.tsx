'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const requestRef = useRef<symbol | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; requestRef.current = null }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || requestRef.current) return
    const request = Symbol('password-recovery-email')
    requestRef.current = request
    setLoading(true)
    const isCurrent = () => mountedRef.current && requestRef.current === request
    try {
      const { error } = await resetPassword(email.trim())
      if (!isCurrent()) return
      if (error) {
        toast.error('Envoi impossible. Vérifie ta connexion et réessaie.')
        return
      }
      setSent(true)
      toast.success('Demande de réinitialisation envoyée')
    } catch {
      if (isCurrent()) toast.error('Envoi impossible. Vérifie ta connexion et réessaie.')
    } finally {
      if (requestRef.current === request) {
        requestRef.current = null
        if (mountedRef.current) setLoading(false)
      }
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="glass rounded-3xl p-8 md:p-10">
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl font-semibold text-[var(--justice)]">
            Mot de passe oublié
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Reçois un lien de réinitialisation par email
          </p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mb-4 text-5xl">📬</div>
            <p className="mb-6 text-sm text-[var(--text-secondary)]">
              Si un compte correspond à <strong>{email.trim()}</strong>, tu recevras
              un lien pour choisir un nouveau mot de passe. Ouvre-le dans ce navigateur.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--justice)] hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="email"
              label="Adresse email"
              type="email"
              placeholder="toi@exemple.fr"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!email}
            >
              Envoyer le lien
            </Button>
            <p className="text-center text-sm text-[var(--text-secondary)]">
              <Link href="/login" className="hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
