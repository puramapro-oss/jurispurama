'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Aide, Step } from '@/types/financer'
import FinancerStepper from '@/components/financer/FinancerStepper'
import ProfilSelector from '@/components/financer/ProfilSelector'
import AidesMatching from '@/components/financer/AidesMatching'
import DossierConstitution from '@/components/financer/DossierConstitution'
import SuiviDemandes from '@/components/financer/SuiviDemandes'

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

        <FinancerStepper step={step} />

        {step === 1 && (
          <ProfilSelector
            profil={profil}
            situation={situation}
            setProfil={setProfil}
            setSituation={setSituation}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <AidesMatching
            aides={aides}
            selectedAides={selectedAides}
            toggleAide={toggleAide}
            loading={loading}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <DossierConstitution
            aides={aides}
            selectedAides={selectedAides}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}

        {step === 4 && (
          <SuiviDemandes
            selectedCount={selectedAides.size}
            onRestart={() => setStep(1)}
          />
        )}
      </div>
    </div>
  )
}
