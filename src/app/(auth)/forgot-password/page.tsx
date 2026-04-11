'use client'

import { useState } from 'react'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const { error } = await resetPassword(email)
    setLoading(false)
    if (error) {
      toast.error('Envoi impossible : ' + error.message)
      return
    }
    setSent(true)
    toast.success('Email de réinitialisation envoyé')
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
              Un email a été envoyé à <strong>{email}</strong>. Clique sur le
              lien reçu pour choisir un nouveau mot de passe.
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
