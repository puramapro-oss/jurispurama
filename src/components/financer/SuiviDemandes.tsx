import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface SuiviDemandesProps {
  selectedCount: number
  onRestart: () => void
}

export default function SuiviDemandes({
  selectedCount,
  onRestart,
}: SuiviDemandesProps) {
  return (
    <Card>
      <div className="p-6 space-y-4">
        <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
          Suivi de tes demandes
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          Tu as sélectionné {selectedCount} aide{selectedCount > 1 ? 's' : ''}.
          Utilise JurisIA pour t&apos;aider à rédiger tes courriers et suivre tes
          démarches.
        </p>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-800">
            Astuce : ouvre un nouveau dossier JurisIA en mentionnant
            l&apos;aide que tu vises. L&apos;IA t&apos;accompagnera étape par étape.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onRestart}>
            Recommencer
          </Button>
          <Link href="/chat" className="flex-1">
            <Button fullWidth>Ouvrir JurisIA pour m&apos;aider</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}
