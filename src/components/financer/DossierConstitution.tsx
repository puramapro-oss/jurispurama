import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import type { Aide } from '@/types/financer'

interface DossierConstitutionProps {
  aides: Aide[]
  selectedAides: Set<string>
  onBack: () => void
  onNext: () => void
}

export default function DossierConstitution({
  aides,
  selectedAides,
  onBack,
  onNext,
}: DossierConstitutionProps) {
  return (
    <Card>
      <div className="p-6 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
          Constitution de ton dossier
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Voici les aides sélectionnées. Pour chacune, tu trouveras le lien
          officiel pour faire ta demande.
        </p>
        <div className="space-y-3">
          {aides
            .filter((a) => selectedAides.has(a.id))
            .map((aide, i) => (
              <div
                key={aide.id}
                className="rounded-xl border border-[var(--border)] bg-white/40 p-4"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--justice)] text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {aide.nom}
                  </h3>
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {aide.description}
                </p>
                {aide.url_officielle && (
                  <a
                    href={aide.url_officielle}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[var(--justice)]/10 px-3 py-1.5 text-xs font-medium text-[var(--justice)] hover:bg-[var(--justice)]/20 transition"
                  >
                    Faire ma demande &rarr;
                  </a>
                )}
              </div>
            ))}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onBack}>
            Retour
          </Button>
          <Button onClick={onNext} fullWidth>
            Passer au suivi
          </Button>
        </div>
      </div>
    </Card>
  )
}
