'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface RegenerateCardProps {
  onRegenerate: (instructions: string) => void
  loading: boolean
}

export default function RegenerateCard({ onRegenerate, loading }: RegenerateCardProps) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  const handleRegenerate = () => {
    onRegenerate(text)
  }

  return (
    <Card padding="md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium text-[var(--justice)]">
          🔁 Régénérer avec modifications
        </span>
        <span
          className={`text-lg transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        >
          ⌄
        </span>
      </button>
      {open && (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="Précise ce que tu veux changer : ajouter un argument, modifier un montant, changer le destinataire…"
            className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
          />
          <div className="mt-3 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={handleRegenerate}
              loading={loading}
            >
              Régénérer
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
