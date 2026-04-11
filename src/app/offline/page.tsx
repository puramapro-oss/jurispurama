import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Hors ligne',
  description: 'Page disponible hors connexion — JurisPurama',
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <div className="bg-cinematic relative flex min-h-screen items-center justify-center px-6 text-white">
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-4xl backdrop-blur-md">
          📡
        </div>
        <h1 className="font-serif text-4xl font-semibold italic leading-tight md:text-5xl">
          Tu es hors ligne
        </h1>
        <p className="mt-5 text-white/70">
          Pas de connexion internet actuellement. Certaines fonctionnalités de
          JurisPurama sont limitées, mais tes dossiers récents restent
          consultables une fois la connexion rétablie.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur-md transition hover:border-[var(--gold)]/60"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-6 text-sm font-semibold text-[var(--justice-dark)] shadow-lg shadow-[rgba(201,168,76,0.25)]"
          >
            Ouvrir mon espace
          </Link>
        </div>
        <p className="mt-8 text-xs text-white/45">
          La connexion sera automatiquement restaurée dès que tu retrouveras un
          accès internet.
        </p>
      </div>
    </div>
  )
}
