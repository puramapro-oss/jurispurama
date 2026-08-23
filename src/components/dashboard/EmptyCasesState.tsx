import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function EmptyCasesState() {
  return (
    <Card padding="lg" className="text-center">
      <div className="mb-3 text-5xl">📂</div>
      <h3 className="font-serif text-xl font-semibold text-[var(--justice)]">
        Bienvenue sur JurisPurama
      </h3>
      <p className="mt-2 mb-6 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
        Raconte ton premier problème juridique à JurisIA. Un dossier sera créé
        automatiquement et tu pourras y revenir à tout moment.
      </p>
      <Link href="/chat">
        <Button variant="primary" size="md">
          Créer mon premier dossier
        </Button>
      </Link>
    </Card>
  )
}
