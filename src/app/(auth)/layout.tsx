import Link from 'next/link'
import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-parchment">
      <header className="absolute left-0 right-0 top-0 z-10 px-6 py-5">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[var(--justice)] hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">⚖️</span>
          <span className="font-serif text-xl font-semibold">{APP_NAME}</span>
        </Link>
      </header>
      <main className="flex min-h-screen items-center justify-center px-4 py-24">
        {children}
      </main>
      <footer className="absolute bottom-0 left-0 right-0 px-6 py-5 text-center text-xs text-[var(--text-muted)]">
        <Link href="/mentions-legales" className="hover:underline">
          Mentions légales
        </Link>
        {' · '}
        <Link href="/politique-confidentialite" className="hover:underline">
          Confidentialité
        </Link>
        {' · '}
        <Link href="/cgu" className="hover:underline">
          CGU
        </Link>
      </footer>
    </div>
  )
}
