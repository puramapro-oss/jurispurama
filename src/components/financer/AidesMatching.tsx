import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { Aide } from '@/types/financer'
import { TYPE_LABELS } from '@/lib/financer-constants'

interface AidesMatchingProps {
  aides: Aide[]
  selectedAides: Set<string>
  toggleAide: (id: string) => void
  loading: boolean
  onBack: () => void
  onNext: () => void
}

export default function AidesMatching({
  aides,
  selectedAides,
  toggleAide,
  loading,
  onBack,
  onNext,
}: AidesMatchingProps) {
  const totalMax = aides
    .filter((a) => selectedAides.has(a.id))
    .reduce((sum, a) => sum + (a.montant_max ?? 0), 0)

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl bg-white/5"
          />
        ))}
      </div>
    )
  }

  if (aides.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            Aucune aide trouvée pour ce profil. Essaie avec un autre profil ou
            une autre situation.
          </p>
          <Button variant="ghost" className="mt-4" onClick={onBack}>
            Modifier mon profil
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          <strong className="text-[var(--justice)]">{aides.length}</strong>{' '}
          aide{aides.length > 1 ? 's' : ''} disponible
          {aides.length > 1 ? 's' : ''} pour toi
        </p>
        {selectedAides.size > 0 && (
          <p className="text-sm font-semibold text-emerald-600">
            Cumul potentiel :{' '}
            {totalMax > 0 ? `jusqu'à ${totalMax.toLocaleString('fr-FR')} €` : 'Gratuit'}
          </p>
        )}
      </div>
      {aides.map((aide) => {
        const t = TYPE_LABELS[aide.type_aide] ?? {
          label: aide.type_aide,
          variant: 'default' as const,
        }
        const selected = selectedAides.has(aide.id)
        return (
          <Card
            key={aide.id}
            className={`cursor-pointer transition ${
              selected ? 'ring-2 ring-[var(--justice)] ring-offset-2' : ''
            }`}
            onClick={() => toggleAide(aide.id)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {aide.nom}
                    </h3>
                    <Badge variant={t.variant} size="sm">
                      {t.label}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                    {aide.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {aide.montant_max !== null && aide.montant_max > 0 ? (
                    <p className="font-mono text-sm font-bold text-emerald-600">
                      Jusqu&apos;à {aide.montant_max.toLocaleString('fr-FR')} €
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-[var(--gold-dark)]">
                      Gratuit
                    </p>
                  )}
                </div>
              </div>
              {aide.url_officielle && (
                <a
                  href={aide.url_officielle}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-block text-xs font-medium text-[var(--justice)] underline-offset-2 hover:underline"
                >
                  Site officiel &rarr;
                </a>
              )}
            </div>
          </Card>
        )
      })}
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={onNext} disabled={selectedAides.size === 0} fullWidth>
          Constituer mon dossier ({selectedAides.size} aide
          {selectedAides.size > 1 ? 's' : ''})
        </Button>
      </div>
    </div>
  )
}
