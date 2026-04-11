import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-parchment">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <div className="mb-4 text-6xl">⚖️</div>
        <h1 className="font-serif text-4xl font-semibold text-[var(--justice)]">
          404
        </h1>
        <p className="mt-2 text-lg text-[var(--text-secondary)]">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-[var(--justice)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--justice-light)] transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
