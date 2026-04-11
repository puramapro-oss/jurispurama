import Card from '@/components/ui/Card'

export default function ProfilPage() {
  return (
    <div className="container-narrow py-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
          Profil juridique intelligent
        </p>
        <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
          Ton profil juridique
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          JurisIA utilise ces informations pour pré-remplir automatiquement
          tes documents juridiques.
        </p>
      </header>

      <Card padding="lg" className="text-center">
        <div className="mb-3 text-5xl">👤</div>
        <h2 className="mb-2 font-serif text-xl font-semibold text-[var(--justice)]">
          Bientôt disponible
        </h2>
        <p className="mx-auto max-w-md text-sm text-[var(--text-secondary)]">
          Le profil juridique complet (identité, véhicule, emploi, logement,
          bancaire) arrive dans la prochaine mise à jour. Pour l&apos;instant,
          JurisIA te posera les questions nécessaires dans chaque dossier.
        </p>
      </Card>
    </div>
  )
}
