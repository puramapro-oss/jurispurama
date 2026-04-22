'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { toast } from 'sonner'

interface Props {
  userId: string
  year: number
}

export default function FiscalSummaryDownload({ year }: Props) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const res = await fetch(`/api/cron/annual-summary?year=${year}&preview=1`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Impossible de générer le récapitulatif.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `jurispurama-recapitulatif-${year}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Récapitulatif téléchargé.')
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6 border-2 border-[var(--justice)]/20">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <h3 className="font-serif text-lg font-semibold text-[var(--justice)]">
            Récapitulatif annuel {year}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            PDF officiel Purama récapitulant tous tes gains (primes, parrainage,
            concours, missions). À joindre à ta déclaration si besoin.
          </p>
        </div>
        <Button variant="primary" loading={loading} onClick={download}>
          Télécharger le récapitulatif
        </Button>
      </div>
    </Card>
  )
}
