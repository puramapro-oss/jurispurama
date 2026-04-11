'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'

interface AdminUser {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  subscription_plan: 'free' | 'essentiel' | 'pro' | 'avocat_virtuel'
  stripe_customer_id: string | null
  created_at: string
  referral_code: string | null
  role: string
}

const PLANS: Array<AdminUser['subscription_plan']> = [
  'free',
  'essentiel',
  'pro',
  'avocat_virtuel',
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (planFilter) params.set('plan', planFilter)
      params.set('page', String(page))
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(data.error ?? 'Erreur de chargement')
        return
      }
      const data = (await res.json()) as {
        users: AdminUser[]
        total: number
      }
      setUsers(data.users)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [q, planFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  async function updatePlan(userId: string, plan: AdminUser['subscription_plan']) {
    setUpdatingId(userId)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, subscription_plan: plan }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? 'Mise à jour impossible')
        return
      }
      toast.success('Plan mis à jour')
      await load()
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="font-serif text-2xl font-semibold text-[var(--justice)]">
          Utilisateurs ({total})
        </h2>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            id="search"
            type="search"
            placeholder="Email ou nom…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous les plans</option>
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 px-2">Nom</th>
                <th className="py-2 px-2">Plan</th>
                <th className="py-2 px-2">Inscrit le</th>
                <th className="py-2 px-2">Référent</th>
                <th className="py-2 pl-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-[var(--border)]/50"
                >
                  <td className="py-2 pr-2 font-mono text-xs text-[var(--text-primary)]">
                    {u.email}
                  </td>
                  <td className="py-2 px-2 text-[var(--text-secondary)]">
                    {u.full_name ?? '—'}
                  </td>
                  <td className="py-2 px-2">
                    <Badge variant={u.subscription_plan === 'free' ? 'gray' : 'gold'}>
                      {u.subscription_plan}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-xs text-[var(--text-muted)]">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2 px-2 font-mono text-xs text-[var(--text-muted)]">
                    {u.referral_code ?? '—'}
                  </td>
                  <td className="py-2 pl-2">
                    <select
                      disabled={updatingId === u.id}
                      value={u.subscription_plan}
                      onChange={(e) =>
                        updatePlan(
                          u.id,
                          e.target.value as AdminUser['subscription_plan']
                        )
                      }
                      className="rounded-lg border border-[var(--border)] bg-white px-2 py-1 text-xs"
                    >
                      {PLANS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          Page {page} · {total} utilisateurs au total
        </span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Précédent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={users.length < 25}
          >
            Suivant →
          </Button>
        </div>
      </div>
    </Card>
  )
}
