'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { getGreeting } from '@/lib/utils'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { LEGAL_DOMAINS } from '@/lib/constants'

export default function DashboardPage() {
  const { profile, loading } = useAuth()

  const firstName = profile?.full_name?.split(' ')[0] ?? ''

  return (
    <div className="container-narrow py-8 md:py-12">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wider text-[var(--gold-dark)]">
          Tableau de bord
        </p>
        <h1 className="mt-2 font-serif text-3xl md:text-4xl font-semibold text-[var(--justice)]">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          {loading
            ? 'Chargement de ton espace…'
            : 'Prêt à faire valoir tes droits ? JurisIA est à ta disposition.'}
        </p>
      </header>

      {/* CTA principale */}
      <Card padding="lg" className="mb-8 bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] border-none">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-white">
              Nouveau dossier juridique
            </h2>
            <p className="mt-2 text-white/80">
              Raconte ton problème à JurisIA. En 3 minutes tu as un plan
              d&apos;action, les articles de loi qui te protègent et un
              document prêt à signer.
            </p>
          </div>
          <Link href="/chat">
            <Button variant="gold" size="lg">
              Démarrer un dossier
            </Button>
          </Link>
        </div>
      </Card>

      {/* Empty state dossiers */}
      <section className="mb-10">
        <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
          Mes dossiers en cours
        </h2>
        <Card padding="lg" className="text-center">
          <div className="mb-3 text-5xl">📂</div>
          <h3 className="font-serif text-xl font-semibold text-[var(--justice)]">
            Aucun dossier pour le moment
          </h3>
          <p className="mt-2 mb-6 text-sm text-[var(--text-secondary)] max-w-md mx-auto">
            Dès ton premier message à JurisIA, un dossier sera créé
            automatiquement. Tu pourras y revenir à tout moment.
          </p>
          <Link href="/chat">
            <Button variant="primary" size="md">
              Créer mon premier dossier
            </Button>
          </Link>
        </Card>
      </section>

      {/* Domaines couverts */}
      <section>
        <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
          Les 12 domaines du droit couverts
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {LEGAL_DOMAINS.map((d) => (
            <div
              key={d.id}
              className="glass rounded-xl p-4 flex items-center gap-3"
            >
              <span className="text-2xl" aria-hidden="true">
                {d.icon}
              </span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {d.label}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
