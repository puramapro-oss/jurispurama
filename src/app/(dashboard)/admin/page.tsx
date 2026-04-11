'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface AdminStats {
  users: {
    total: number
    active30d: number
    subscribers: number
    plansBreakdown: Record<string, number>
  }
  revenue: {
    mrrEstimate: number
    arrEstimate: number
    last30d: number
    conversionRate: number
  }
  cases: {
    total: number
    resolu: number
    documentsTotal: number
    moneySaved: number
  }
  dailyRevenue: Array<{ date: string; amount: number }>
  recentSignups: Array<{
    id: string
    email: string
    full_name: string | null
    subscription_plan: string
    created_at: string
  }>
  recentPayments: Array<{
    id: string
    user_id: string
    amount: number
    type: string
    status: string
    created_at: string
    stripe_payment_id: string | null
  }>
}

function formatEuros(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(data.error ?? `HTTP ${res.status}`)
        }
        return res.json() as Promise<AdminStats>
      })
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [])

  if (error) {
    return (
      <Card padding="lg">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    )
  }
  if (!stats) {
    return <p className="text-sm text-[var(--text-muted)]">Chargement…</p>
  }

  const chartData = stats.dailyRevenue.map((d) => ({
    date: d.date.slice(5),
    amount: Number(d.amount.toFixed(2)),
  }))

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            MRR (approx.)
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {formatEuros(stats.revenue.mrrEstimate)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            ARR : {formatEuros(stats.revenue.arrEstimate)}
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Utilisateurs
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--justice)]">
            {stats.users.total}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {stats.users.active30d} actifs 30j · {stats.users.subscribers}{' '}
            abonnés
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Taux de conversion
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-[var(--gold-dark)]">
            {stats.revenue.conversionRate}%
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Free → payant
          </p>
        </Card>
        <Card padding="lg">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            Argent économisé
          </p>
          <p className="mt-1 font-serif text-3xl font-bold text-emerald-700">
            {formatEuros(stats.cases.moneySaved)}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {stats.cases.resolu} dossiers gagnés
          </p>
        </Card>
      </div>

      {/* Plans breakdown */}
      <Card padding="lg">
        <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
          Répartition des plans
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          {(['free', 'essentiel', 'pro', 'avocat_virtuel'] as const).map((p) => (
            <div
              key={p}
              className="rounded-xl border border-[var(--border)] bg-white/60 p-3 text-center"
            >
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                {p === 'free'
                  ? 'Gratuit'
                  : p === 'avocat_virtuel'
                    ? 'Avocat Virtuel'
                    : p.charAt(0).toUpperCase() + p.slice(1)}
              </p>
              <p className="mt-1 font-serif text-2xl font-bold text-[var(--justice)]">
                {stats.users.plansBreakdown[p] ?? 0}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Revenue chart */}
      <Card padding="lg">
        <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
          Revenus des 30 derniers jours
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                formatter={(value) =>
                  typeof value === 'number' ? formatEuros(value) : String(value)
                }
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#1E3A5F"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recent activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Derniers signups
            </h2>
            <Link
              href="/admin/users"
              className="text-xs text-[var(--justice)] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <ul className="space-y-2">
            {stats.recentSignups.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {u.full_name ?? u.email}
                  </p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {u.email} · {formatDate(u.created_at)}
                  </p>
                </div>
                <Badge variant={u.subscription_plan === 'free' ? 'gray' : 'gold'}>
                  {u.subscription_plan}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Derniers paiements
            </h2>
            <Link
              href="/admin/payments"
              className="text-xs text-[var(--justice)] hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <ul className="space-y-2">
            {stats.recentPayments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {formatEuros(Number(p.amount ?? 0))}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {p.type} · {formatDate(p.created_at)}
                  </p>
                </div>
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
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
