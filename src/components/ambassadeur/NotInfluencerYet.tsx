import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function NotInfluencerYet() {
  return (
    <div className="container-narrow py-10">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Programme partenaire
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Deviens ambassadeur JurisPurama
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
          Validation automatique en 1 clic. Plan Essentiel offert à vie,
          commissions jusqu&apos;à 25%, page publique personnalisée.
        </p>
      </header>
      <Card padding="lg">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-xl font-semibold text-[var(--justice)]">
              Tu n&apos;es pas encore partenaire
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Remplis le formulaire (2 minutes) et accède à ton espace dédié
              immédiatement.
            </p>
          </div>
          <Link href="/apply/ambassadeur">
            <Button variant="primary" size="md">
              Candidater maintenant →
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
