'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface Payment {
  id: string
  user_id: string
  stripe_payment_id: string | null
  amount: number
  type: string
  status: string
  created_at: string
}

const TYPE_FILTERS = ['', 'subscription', 'recommande', 'signature', 'dossier']
const STATUS_FILTERS = ['', 'succeeded', 'pending', 'paid', 'failed', 'simulated']

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (type) params.set('type', type)
      if (status) params.set('status', status)
      const res = await fetch(`/api/admin/payments?${params.toString()}`)
      if (!res.ok) {
        toast.error('Erreur de chargement')
        return
      }
      const data = (await res.json()) as { payments: Payment[] }
      setPayments(data.payments)
    } finally {
      setLoading(false)
    }
  }, [type, status])

  useEffect(() => {
    void load()
  }, [load])

  const total = payments
    .filter((p) => p.status === 'succeeded' || p.status === 'paid')
    .reduce((a, b) => a + Number(b.amount ?? 0), 0)

  async function downloadCsv() {
    const params = new URLSearchParams({ format: 'csv' })
    if (type) params.set('type', type)
    if (status) params.set('status', status)
    window.location.href = `/api/admin/payments?${params.toString()}`
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
          Paiements
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {TYPE_FILTERS.map((t) => (
              <option key={t} value={t}>
                {t || 'Tous les types'}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s || 'Tous les statuts'}
              </option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={downloadCsv}>
            Exporter CSV
          </Button>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-[var(--border)] bg-[var(--parchment)] p-3 text-sm">
        <strong className="text-[var(--justice)]">
          {total.toFixed(2)} €
        </strong>{' '}
        encaissés sur la période filtrée.
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Aucun paiement.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-2 pr-2">ID</th>
                <th className="py-2 px-2">Stripe ID</th>
                <th className="py-2 px-2">Montant</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2">Statut</th>
                <th className="py-2 pl-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-[var(--border)]/50">
                  <td className="py-2 pr-2 font-mono text-xs text-[var(--text-muted)]">
                    {p.id.slice(0, 8)}
                  </td>
                  <td className="py-2 px-2 font-mono text-xs text-[var(--text-muted)]">
                    {p.stripe_payment_id?.slice(0, 20) ?? '—'}
                  </td>
                  <td className="py-2 px-2 font-semibold text-[var(--justice)]">
                    {Number(p.amount ?? 0).toFixed(2)} €
                  </td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">{p.type}</td>
                  <td className="py-2 px-2">
                    <Badge
                      variant={
                        p.status === 'succeeded' || p.status === 'paid'
                          ? 'green'
                          : p.status === 'pending'
                            ? 'amber'
                            : 'gray'
                      }
                    >
                      {p.status}
                    </Badge>
                  </td>
                  <td className="py-2 pl-2 text-xs text-[var(--text-muted)]">
                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
