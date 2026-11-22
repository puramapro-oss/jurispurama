import Card from '@/components/ui/Card'

interface LeaderRow {
  rank: number
  name: string
  conversions: number
  commissions: number
}

interface AmbassadorLeaderboardProps {
  leaderboard: LeaderRow[]
}

export default function AmbassadorLeaderboard({
  leaderboard,
}: AmbassadorLeaderboardProps) {
  return (
    <Card padding="lg" className="mt-6">
      <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
        Classement des ambassadeurs
      </h2>
      {leaderboard.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Aucun classement vérifié n&apos;est disponible pour le moment.
          Tes statistiques personnelles restent disponibles dans ton tableau de bord.
        </p>
      ) : <ul className="space-y-2">
        {leaderboard.map((row) => (
          <li
            key={row.rank}
            className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-white/60 px-4 py-2 text-sm"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 font-bold text-[var(--gold-dark)]">
                #{row.rank}
              </span>
              <span className="text-[var(--text-primary)]">{row.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <span>{row.conversions} conv.</span>
              <span className="font-mono font-semibold text-[var(--justice)]">
                {(row.commissions / 100).toFixed(2)} €
              </span>
            </div>
          </li>
        ))}
      </ul>}
    </Card>
  )
}
