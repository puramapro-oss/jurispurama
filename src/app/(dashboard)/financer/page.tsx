'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

interface Aide {
  id: string
  nom: string
  type_aide: string
  profil_eligible: string[]
  situation_eligible: string[]
  montant_max: number | null
  url_officielle: string | null
  description: string
  region: string | null
  handicap_only: boolean
}

const PROFILS = [
  { value: 'salarie', label: 'Salarié(e)' },
  { value: 'chomeur', label: 'Demandeur d\'emploi' },
  { value: 'etudiant', label: 'Étudiant(e)' },
  { value: 'retraite', label: 'Retraité(e)' },
  { value: 'independant', label: 'Indépendant(e)' },
]

const SITUATIONS = [
  { value: 'litige', label: 'Litige civil' },
  { value: 'travail', label: 'Droit du travail' },
  { value: 'logement', label: 'Logement' },
  { value: 'famille', label: 'Famille / divorce' },
  { value: 'consommation', label: 'Consommation' },
  { value: 'penal', label: 'Pénal / victime' },
  { value: 'administration', label: 'Administration' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'surendettement', label: 'Surendettement' },
  { value: 'numerique', label: 'Numérique / RGPD' },
]

const TYPE_LABELS: Record<string, { label: string; variant: 'justice' | 'green' | 'gold' | 'blue' | 'purple' }> = {
  aide_etat: { label: 'Aide de l\'État', variant: 'justice' },
  assurance: { label: 'Assurance', variant: 'blue' },
  consultation: { label: 'Consultation gratuite', variant: 'green' },
  mediation: { label: 'Médiation', variant: 'gold' },
  association: { label: 'Association', variant: 'purple' },
}

type Step = 1 | 2 | 3 | 4

export default function FinancerPage() {
  const [step, setStep] = useState<Step>(1)
  const [profil, setProfil] = useState('')
  const [situation, setSituation] = useState('')
  const [aides, setAides] = useState<Aide[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAides, setSelectedAides] = useState<Set<string>>(new Set())

  const fetchAides = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (profil) params.set('profil', profil)
      if (situation) params.set('situation', situation)
      const res = await fetch(`/api/financer?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setAides(json.aides ?? [])
    } catch {
      toast.error('Impossible de charger les aides.')
    } finally {
      setLoading(false)
    }
  }, [profil, situation])

  useEffect(() => {
    if (step === 2 && (profil || situation)) {
      fetchAides()
    }
  }, [step, profil, situation, fetchAides])

  const toggleAide = (id: string) => {
    setSelectedAides((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalMax = aides
    .filter((a) => selectedAides.has(a.id))
    .reduce((sum, a) => sum + (a.montant_max ?? 0), 0)

  const stepLabels = ['Ton profil', 'Aides disponibles', 'Ton dossier', 'Suivi']

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
            Financer ton dossier juridique
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Découvre les aides auxquelles tu as droit. La plupart des gens ne
            paient rien grâce aux aides.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2">
          {stepLabels.map((label, i) => {
            const s = (i + 1) as Step
            const active = step === s
            const done = step > s
            return (
              <div key={s} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                    active
                      ? 'bg-[var(--justice)] text-white'
                      : done
                        ? 'bg-[var(--gold)] text-[var(--justice-dark)]'
                        : 'bg-white/60 text-[var(--text-muted)] border border-[var(--border)]'
                  }`}
                >
                  {done ? '✓' : s}
                </div>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    active
                      ? 'text-[var(--justice)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {label}
                </span>
                {i < 3 && (
                  <div
                    className={`mx-1 h-px flex-1 ${
                      done ? 'bg-[var(--gold)]' : 'bg-[var(--border)]'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Step 1 — Profil */}
        {step === 1 && (
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
              <Button
                onClick={() => setStep(2)}
                disabled={!profil && !situation}
                fullWidth
              >
                Voir les aides disponibles
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2 — Matching aides */}
        {step === 2 && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-white/5"
                  />
                ))}
              </div>
            ) : aides.length === 0 ? (
              <Card>
                <div className="p-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">
                    Aucune aide trouvée pour ce profil. Essaie avec un autre
                    profil ou une autre situation.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => setStep(1)}
                  >
                    Modifier mon profil
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[var(--text-secondary)]">
                    <strong className="text-[var(--justice)]">{aides.length}</strong>{' '}
                    aide{aides.length > 1 ? 's' : ''} disponible{aides.length > 1 ? 's' : ''} pour toi
                  </p>
                  {selectedAides.size > 0 && (
                    <p className="text-sm font-semibold text-emerald-600">
                      Cumul potentiel :{' '}
                      {totalMax > 0
                        ? `jusqu'à ${totalMax.toLocaleString('fr-FR')} €`
                        : 'Gratuit'}
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
                        selected
                          ? 'ring-2 ring-[var(--justice)] ring-offset-2'
                          : ''
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
                            {aide.montant_max !== null &&
                            aide.montant_max > 0 ? (
                              <p className="font-mono text-sm font-bold text-emerald-600">
                                Jusqu&apos;à{' '}
                                {aide.montant_max.toLocaleString('fr-FR')} €
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
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    Retour
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={selectedAides.size === 0}
                    fullWidth
                  >
                    Constituer mon dossier ({selectedAides.size} aide
                    {selectedAides.size > 1 ? 's' : ''})
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 3 — Dossier */}
        {step === 3 && (
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
                Constitution de ton dossier
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Voici les aides sélectionnées. Pour chacune, tu trouveras le
                lien officiel pour faire ta demande.
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
                <Button variant="ghost" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button onClick={() => setStep(4)} fullWidth>
                  Passer au suivi
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Step 4 — Suivi */}
        {step === 4 && (
          <Card>
            <div className="p-6 space-y-4">
              <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
                Suivi de tes demandes
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Tu as sélectionné {selectedAides.size} aide
                {selectedAides.size > 1 ? 's' : ''}. Utilise JurisIA pour
                t'aider à rédiger tes courriers et suivre tes démarches.
              </p>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-800">
                  Astuce : ouvre un nouveau dossier JurisIA en mentionnant
                  l'aide que tu vises. L'IA t'accompagnera étape par étape.
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Recommencer
                </Button>
                <Link href="/chat" className="flex-1">
                  <Button fullWidth>
                    Ouvrir JurisIA pour m'aider
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
