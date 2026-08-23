import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { PROFILS, SITUATIONS } from '@/lib/financer-constants'

interface ProfilSelectorProps {
  profil: string
  situation: string
  setProfil: (v: string) => void
  setSituation: (v: string) => void
  onNext: () => void
}

export default function ProfilSelector({
  profil,
  situation,
  setProfil,
  setSituation,
  onNext,
}: ProfilSelectorProps) {
  return (
    <Card>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
            Quel est ton profil ?
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROFILS.map((p) => (
              <button
                key={p.value}
                onClick={() => setProfil(p.value)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  profil === p.value
                    ? 'border-[var(--justice)] bg-[var(--justice)]/10 text-[var(--justice)]'
                    : 'border-[var(--border)] bg-white/40 text-[var(--text-secondary)] hover:border-[var(--justice)]/40'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
            Quelle est ta situation ?
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {SITUATIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSituation(s.value)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                  situation === s.value
                    ? 'border-[var(--justice)] bg-[var(--justice)]/10 text-[var(--justice)]'
                    : 'border-[var(--border)] bg-white/40 text-[var(--text-secondary)] hover:border-[var(--justice)]/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={onNext} disabled={!profil && !situation} fullWidth>
          Voir les aides disponibles
        </Button>
      </div>
    </Card>
  )
}
