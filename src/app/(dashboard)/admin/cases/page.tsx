import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface CaseRow {
  id: string
  user_id: string
  type: string
  sub_type: string | null
  status: string
  summary: string | null
  success_probability: number | null
  money_saved: number
  created_at: string
}

async function loadCases(): Promise<{
  cases: CaseRow[]
  byType: Record<string, number>
  byStatus: Record<string, number>
}> {
  const sb = createServiceClient()
  const { data } = await sb
    .from('jurispurama_cases')
    .select(
      'id, user_id, type, sub_type, status, summary, success_probability, money_saved, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(200)
  const rows = (data ?? []) as CaseRow[]
  const byType: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  rows.forEach((c) => {
    byType[c.type] = (byType[c.type] ?? 0) + 1
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1
  })
  return { cases: rows, byType, byStatus }
}

export default async function AdminCasesPage() {
  const { cases, byType, byStatus } = await loadCases()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="lg">
          <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
            Par statut
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(byStatus).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 px-3 py-2"
              >
                <span className="capitalize text-[var(--text-secondary)]">{k}</span>
                <span className="font-semibold text-[var(--justice)]">{v}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card padding="lg">
          <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
            Par domaine
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(byType).map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 px-3 py-2"
              >
                <span className="capitalize text-[var(--text-secondary)]">{k}</span>
                <span className="font-semibold text-[var(--justice)]">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card padding="lg">
        <h2 className="mb-4 font-serif text-xl font-semibold text-[var(--justice)]">
          Derniers dossiers ({cases.length})
        </h2>
        {cases.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">Aucun dossier.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="py-2 pr-2">ID</th>
                  <th className="py-2 px-2">Domaine</th>
                  <th className="py-2 px-2">Statut</th>
                  <th className="py-2 px-2">Probabilité</th>
                  <th className="py-2 px-2">Gain</th>
                  <th className="py-2 pl-2">Créé le</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)]/50">
                    <td className="py-2 pr-2 font-mono text-xs text-[var(--text-muted)]">
                      {c.id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-2 text-[var(--text-secondary)]">
                      {c.type}
                      {c.sub_type && (
                        <span className="text-xs text-[var(--text-muted)]"> · {c.sub_type}</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        variant={
                          c.status === 'resolu'
                            ? 'green'
                            : c.status === 'envoye' || c.status === 'signe'
                              ? 'blue'
                              : 'gray'
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-[var(--text-secondary)]">
                      {c.success_probability != null ? `${c.success_probability}%` : '—'}
                    </td>
                    <td className="py-2 px-2 text-emerald-700">
                      {Number(c.money_saved ?? 0).toFixed(2)} €
                    </td>
                    <td className="py-2 pl-2 text-xs text-[var(--text-muted)]">
                      {new Date(c.created_at).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
