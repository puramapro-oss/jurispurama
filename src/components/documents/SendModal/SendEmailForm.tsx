'use client'

import { FormEvent } from 'react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface SendEmailFormProps {
  recEmailName: string
  recEmail: string
  subject: string
  bodyMessage: string
  onRecEmailNameChange: (value: string) => void
  onRecEmailChange: (value: string) => void
  onSubjectChange: (value: string) => void
  onBodyMessageChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  loading: boolean
}

export default function SendEmailForm({
  recEmailName,
  recEmail,
  subject,
  bodyMessage,
  onRecEmailNameChange,
  onRecEmailChange,
  onSubjectChange,
  onBodyMessageChange,
  onSubmit,
  onCancel,
  loading,
}: SendEmailFormProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nom du destinataire"
          value={recEmailName}
          onChange={(e) => onRecEmailNameChange(e.target.value)}
          placeholder="Madame Dupont"
          required
        />
        <Input
          label="Email du destinataire"
          type="email"
          value={recEmail}
          onChange={(e) => onRecEmailChange(e.target.value)}
          placeholder="destinataire@exemple.fr"
          required
        />
      </div>
      <Input
        label="Objet"
        value={subject}
        onChange={(e) => onSubjectChange(e.target.value)}
      />
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Message (facultatif)
        </label>
        <textarea
          value={bodyMessage}
          onChange={(e) => onBodyMessageChange(e.target.value)}
          rows={4}
          placeholder="Message court à joindre à l'email…"
          className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
        />
      </div>
      <div className="rounded-xl bg-[var(--bg-nebula)] p-3 text-xs text-[var(--text-secondary)]">
        Le PDF signé sera joint automatiquement. Les réponses du
        destinataire arriveront dans ta boîte mail.
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="gold"
          size="md"
          loading={loading}
        >
          Envoyer l&apos;email
        </Button>
      </div>
    </form>
  )
}
