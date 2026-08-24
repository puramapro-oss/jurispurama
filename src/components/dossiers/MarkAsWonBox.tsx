'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import type { JurisCase } from '@/types'
import { formatEuros } from '@/lib/case-helpers'

interface MarkAsWonBoxProps {
  caseId: string
  currentAmount: number
  currentStatus: string
  onUpdate: (next: JurisCase) => void
}

export default function MarkAsWonBox({
  caseId,
  currentAmount,
  currentStatus,
  onUpdate,
}: MarkAsWonBoxProps) {
  const [amount, setAmount] = useState<string>(
    currentAmount ? String(currentAmount) : ''
  )
  const [saving, setSaving] = useState(false)
  const isResolved = currentStatus === 'resolu'

  const submit = async () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Indique un montant valide en euros.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          money_saved: value,
          status: 'resolu',
        }),
      })
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { case: JurisCase }
      onUpdate(data.case)
      toast.success(`🏆 Dossier résolu — ${formatEuros(value)} économisés !`)
    } catch {
      toast.error('Impossible de valider ce gain.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-xs uppercase tracking-wider text-emerald-700">
        {isResolved ? 'Dossier résolu' : 'Marquer comme résolu'}
      </p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {isResolved
          ? 'Tu peux mettre à jour le montant économisé si besoin.'
          : 'Quand ton dossier est gagné, indique combien tu as économisé ou récupéré.'}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="1"
            placeholder="Ex : 450"
            className="w-full rounded-xl border border-emerald-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-700">
            €
          </span>
        </div>
        <Button variant="gold" size="md" onClick={submit} loading={saving}>
          🏆 {isResolved ? 'Mettre à jour' : 'Valider le gain'}
        </Button>
      </div>
    </div>
  )
}
