'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error(error)
    }
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-parchment">
      <div className="glass max-w-md rounded-3xl p-10 text-center">
        <div className="mb-4 text-6xl">⚖️</div>
        <h1 className="font-serif text-3xl font-semibold text-[var(--justice)]">
          Une erreur est survenue
        </h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Désolé pour la gêne — nous avons été prévenus. Réessaie ou reviens à
          l&apos;accueil.
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          <button
            onClick={reset}
            className="rounded-xl bg-[var(--justice)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--justice-light)]"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="rounded-xl border border-[var(--border-strong)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--justice)] hover:bg-[var(--bg-nebula)]"
          >
            Accueil
          </a>
        </div>
      </div>
    </div>
  )
}
