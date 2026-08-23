export default function ReferralHeader() {
  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
        Parrainage
      </p>
      <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
        Parraine des amis, gagne de l&apos;argent
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
        Pour chaque ami qui s&apos;abonne via ton lien, tu touches{' '}
        <strong>50% de son premier paiement</strong> +{' '}
        <strong>10% récurrent à vie</strong>, payés par virement dès 5 €
        accumulés.
      </p>
    </header>
  )
}
