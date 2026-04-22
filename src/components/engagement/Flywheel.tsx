'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

interface GlobalStats {
  activeUsers: number
  totalPool: number
  avgPerUser: number
}

/**
 * Flywheel visible (V7.1 §20)
 * Affiche en temps réel :
 * - X users actifs
 * - Pool communauté Y€
 * - Moyenne Z€/user
 * Message : "Plus on est nombreux, plus chacun gagne."
 */
export default function Flywheel() {
  const [stats, setStats] = useState<GlobalStats | null>(null)

  useEffect(() => {
    // Endpoint fictif — en Phase 1 on utilise les stats admin si dispo,
    // sinon on affiche des placeholders pour que le composant reste fonctionnel.
    fetch('/api/admin/stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setStats({ activeUsers: 0, totalPool: 0, avgPerUser: 0 })
          return
        }
        const activeUsers = data.total_users ?? data.active_users ?? 0
        const totalPool = Number(data.total_pool ?? 0)
        setStats({
          activeUsers,
          totalPool,
          avgPerUser: activeUsers > 0 ? totalPool / activeUsers : 0,
        })
      })
      .catch(() => setStats({ activeUsers: 0, totalPool: 0, avgPerUser: 0 }))
  }, [])

  if (!stats || stats.activeUsers === 0) return null

  return (
    <Card className="p-6 bg-gradient-to-br from-[var(--justice)]/5 via-white to-[var(--gold)]/5 border-[var(--gold)]/20">
      <h3 className="font-serif text-lg font-semibold text-[var(--justice)] mb-3 flex items-center gap-2">
        <span>⚙️</span>
        <span>La communauté tourne</span>
      </h3>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="font-serif text-2xl font-bold text-[var(--justice)] tabular-nums">
            {stats.activeUsers.toLocaleString('fr-FR')}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Users actifs</div>
        </div>
        <div>
          <div className="font-serif text-2xl font-bold text-[var(--gold-dark)] tabular-nums">
            {stats.totalPool.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="text-xs text-[var(--text-muted)]">Pool communauté</div>
        </div>
        <div>
          <div className="font-serif text-2xl font-bold text-[var(--text-primary)] tabular-nums">
            +{stats.avgPerUser.toFixed(2)}€
          </div>
          <div className="text-xs text-[var(--text-muted)]">Moyenne /user</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--text-secondary)] text-center italic">
        Plus on est nombreux, plus chacun gagne.
      </p>
    </Card>
  )
}
