'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

interface Impact {
  cases_resolved: number
  money_saved_eur: number
  legal_hours_saved: number
  documents_generated: number
  recommande_sent: number
  co2_kg_saved: number
  tree_equivalent: number
}

export default function ImpactDashboard() {
  const [impact, setImpact] = useState<Impact | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/impact', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setImpact(data)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-[var(--text-muted)]">Calcul de ton impact…</p>
      </Card>
    )
  }

  if (!impact) return null

  const stats = [
    {
      icon: '⚖️',
      value: impact.cases_resolved,
      label: 'Dossiers résolus',
      color: '#1E3A5F',
    },
    {
      icon: '💶',
      value: impact.money_saved_eur.toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }),
      label: 'Argent économisé',
      color: '#C9A84C',
    },
    {
      icon: '⏱️',
      value: `${impact.legal_hours_saved}h`,
      label: "Heures d'avocat évitées",
      color: '#6D28D9',
    },
    {
      icon: '🌍',
      value: `${impact.co2_kg_saved} kg`,
      label: 'CO₂ évité (papier + trajets)',
      color: '#22C55E',
    },
    {
      icon: '🌳',
      value: impact.tree_equivalent,
      label: 'Arbres équivalents',
      color: '#10B981',
    },
    {
      icon: '📄',
      value: impact.documents_generated,
      label: 'Documents générés',
      color: '#F59E0B',
    },
  ]

  return (
    <Card className="p-6">
      <h3 className="font-serif text-lg font-semibold text-[var(--justice)] mb-4 flex items-center gap-2">
        <span>🌱</span>
        <span>Mon impact</span>
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-[var(--surface-alt)] p-3 text-center"
          >
            <div className="text-2xl mb-1" aria-hidden>
              {s.icon}
            </div>
            <div
              className="font-serif text-xl font-bold tabular-nums"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
            <div className="text-xs text-[var(--text-muted)] leading-tight">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
