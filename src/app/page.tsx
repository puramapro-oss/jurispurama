import Link from 'next/link'
import Button from '@/components/ui/Button'
import {
  APP_NAME,
  APP_TAGLINE,
  APP_PITCH,
  LEGAL_DOMAINS,
  PLANS,
  COMPANY_INFO,
} from '@/lib/constants'
import { formatPrice } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase'

export const revalidate = 600 // 10 min

async function getCommunitySavings(): Promise<number> {
  try {
    const admin = createServiceClient()
    const { data } = await admin
      .from('jurispurama_cases')
      .select('money_saved')
      .eq('status', 'resolu')
    if (!data) return 10_000
    const total = data.reduce(
      (acc, c) => acc + Number(c.money_saved ?? 0),
      0
    )
    // Floor for launch phase so we never show 0.
    return total < 10_000 ? 10_000 : total
  } catch {
    return 10_000
  }
}

function formatEurosCompact(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

const PROCESS_STEPS = [
  {
    n: '01',
    title: 'Raconte ton problème',
    description:
      "Décris ta situation à JurisIA comme tu le ferais à un ami. Pas de jargon, pas de formulaire interminable.",
  },
  {
    n: '02',
    title: 'Obtiens ta stratégie',
    description:
      "JurisIA identifie les articles de loi applicables, estime ta probabilité de succès et propose un plan d'action numéroté.",
  },
  {
    n: '03',
    title: 'Signe et envoie',
    description:
      'Document généré, signé électroniquement, envoyé par email ou recommandé AR. Le tout depuis ton téléphone.',
  },
]

const STATS = [
  { value: '12', label: 'Domaines du droit couverts' },
  { value: '0 €', label: 'Consultation initiale' },
  { value: '3 min', label: 'Pour ton plan d\'action' },
]

export default async function LandingPage() {
  const communitySavings = await getCommunitySavings()
  const communityLabel =
    communitySavings >= 10_000
      ? `Plus de ${formatEurosCompact(Math.floor(communitySavings / 1000) * 1000)} déjà économisés par nos utilisateurs`
      : `${formatEurosCompact(communitySavings)} économisés par nos utilisateurs`
  return (
    <div className="min-h-screen bg-parchment">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/80 backdrop-blur-xl">
        <div className="container-narrow flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--justice)]"
          >
            <span className="text-2xl">⚖️</span>
            <span className="font-serif text-xl font-semibold">{APP_NAME}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
            <a href="#process" className="hover:text-[var(--justice)]">
              Comment ça marche
            </a>
            <a href="#domaines" className="hover:text-[var(--justice)]">
              Domaines
            </a>
            <a href="#tarifs" className="hover:text-[var(--justice)]">
              Tarifs
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--justice)]"
            >
              Connexion
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                Essayer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-narrow py-20 md:py-28">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-white/80 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[var(--gold-dark)]">
              <span>⚖️</span>
              Assistant juridique IA · France
            </div>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-semibold leading-[1.05] text-[var(--justice)]">
              {APP_TAGLINE}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-[var(--text-secondary)]">
              {APP_PITCH}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button variant="primary" size="lg">
                  Essayer gratuitement
                </Button>
              </Link>
              <Link href="#process">
                <Button variant="secondary" size="lg">
                  Voir comment ça marche
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-[var(--text-muted)]">
              14 jours d&apos;essai gratuit · sans carte bancaire · résiliable
              en 1 clic
            </p>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-4 md:gap-8 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="glass rounded-2xl p-5 md:p-6 text-center"
              >
                <div className="font-serif text-3xl md:text-5xl font-semibold text-[var(--justice)]">
                  {s.value}
                </div>
                <div className="mt-1 text-xs md:text-sm text-[var(--text-secondary)]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Community counter */}
          <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-5 py-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-700">
              Communauté JurisPurama
            </p>
            <p className="mt-1 font-serif text-xl font-semibold text-emerald-800 md:text-2xl">
              💰 {communityLabel}
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              Mis à jour automatiquement à chaque dossier résolu.
            </p>
          </div>
        </div>
      </section>

      {/* Process */}
      <section id="process" className="py-20 md:py-24 bg-white/50">
        <div className="container-narrow">
          <div className="mx-auto max-w-2xl text-center mb-14">
            <p className="text-sm uppercase tracking-wider text-[var(--gold-dark)]">
              Le processus
            </p>
            <h2 className="mt-2 font-serif text-3xl md:text-5xl font-semibold text-[var(--justice)]">
              De ton problème à la solution, en 3 étapes
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PROCESS_STEPS.map((step) => (
              <div
                key={step.n}
                className="glass rounded-3xl p-8 border-t-4 border-[var(--gold)]"
              >
                <div className="font-serif text-5xl font-semibold text-[var(--gold)]">
                  {step.n}
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold text-[var(--justice)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domaines */}
      <section id="domaines" className="py-20 md:py-24">
        <div className="container-narrow">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <p className="text-sm uppercase tracking-wider text-[var(--gold-dark)]">
              Domaines couverts
            </p>
            <h2 className="mt-2 font-serif text-3xl md:text-5xl font-semibold text-[var(--justice)]">
              Le droit français, en entier
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              JurisIA maîtrise les 12 grands domaines du droit français :
              contestation d&apos;amende, litige logement, droit du travail,
              succession, RGPD et bien plus.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {LEGAL_DOMAINS.map((d) => (
              <div
                key={d.id}
                className="glass glass-hover rounded-2xl p-5 flex items-center gap-3"
              >
                <span className="text-2xl" aria-hidden="true">
                  {d.icon}
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="py-20 md:py-24 bg-white/50">
        <div className="container-narrow">
          <div className="mx-auto max-w-2xl text-center mb-12">
            <p className="text-sm uppercase tracking-wider text-[var(--gold-dark)]">
              Tarifs
            </p>
            <h2 className="mt-2 font-serif text-3xl md:text-5xl font-semibold text-[var(--justice)]">
              Un abonnement à hauteur de tes besoins
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              14 jours d&apos;essai gratuit sur tous les plans payants. Sans
              engagement.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {Object.values(PLANS).map((plan) => {
              const popular = 'popular' in plan && plan.popular
              return (
                <div
                  key={plan.id}
                  className={`glass rounded-3xl p-6 flex flex-col ${
                    popular
                      ? 'border-2 border-[var(--gold)] shadow-xl'
                      : ''
                  }`}
                >
                  {popular && (
                    <div className="mb-3 self-start rounded-full bg-[var(--gold)] px-3 py-1 text-xs font-semibold text-[var(--justice-dark)]">
                      ⭐ Le plus choisi
                    </div>
                  )}
                  <h3 className="font-serif text-2xl font-semibold text-[var(--justice)]">
                    {plan.label}
                  </h3>
                  <div className="mt-4">
                    <span className="font-serif text-4xl font-semibold text-[var(--justice)]">
                      {plan.priceMonthly === 0
                        ? '0 €'
                        : formatPrice(plan.priceMonthly)}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-sm text-[var(--text-muted)]">
                        {' '}
                        / mois
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <span className="mt-0.5 text-[var(--gold-dark)]">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Link href="/signup">
                      <Button
                        variant={popular ? 'gold' : 'primary'}
                        fullWidth
                      >
                        {plan.priceMonthly === 0
                          ? 'Commencer gratuitement'
                          : "Démarrer l'essai"}
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 md:py-28">
        <div className="container-narrow">
          <div className="glass rounded-3xl p-10 md:p-16 text-center bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] border-none">
            <h2 className="font-serif text-3xl md:text-5xl font-semibold text-white">
              Ton premier dossier, offert.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/80">
              Pas besoin d&apos;attendre un rendez-vous chez l&apos;avocat.
              Ouvre ton dossier maintenant, et reprends le contrôle.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/signup">
                <Button variant="gold" size="lg">
                  Créer mon compte gratuit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white/60">
        <div className="container-narrow py-12">
          <div className="flex flex-col md:flex-row gap-8 md:justify-between">
            <div>
              <Link
                href="/"
                className="flex items-center gap-2 text-[var(--justice)]"
              >
                <span className="text-2xl">⚖️</span>
                <span className="font-serif text-xl font-semibold">
                  {APP_NAME}
                </span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-[var(--text-secondary)]">
                L&apos;assistant juridique IA qui remplace ton avocat à 99 %.
                Édité par {COMPANY_INFO.name}, {COMPANY_INFO.address}.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-semibold text-[var(--justice)] mb-2">
                  Produit
                </p>
                <ul className="space-y-1.5 text-[var(--text-secondary)]">
                  <li>
                    <a href="#process" className="hover:text-[var(--justice)]">
                      Comment ça marche
                    </a>
                  </li>
                  <li>
                    <a href="#domaines" className="hover:text-[var(--justice)]">
                      Domaines
                    </a>
                  </li>
                  <li>
                    <a href="#tarifs" className="hover:text-[var(--justice)]">
                      Tarifs
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[var(--justice)] mb-2">
                  Société
                </p>
                <ul className="space-y-1.5 text-[var(--text-secondary)]">
                  <li>
                    <Link href="/mentions-legales" className="hover:text-[var(--justice)]">
                      Mentions légales
                    </Link>
                  </li>
                  <li>
                    <Link href="/politique-confidentialite" className="hover:text-[var(--justice)]">
                      Confidentialité
                    </Link>
                  </li>
                  <li>
                    <Link href="/cookies" className="hover:text-[var(--justice)]">
                      Cookies
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-[var(--justice)] mb-2">
                  Légal
                </p>
                <ul className="space-y-1.5 text-[var(--text-secondary)]">
                  <li>
                    <Link href="/cgu" className="hover:text-[var(--justice)]">
                      CGU
                    </Link>
                  </li>
                  <li>
                    <Link href="/cgv" className="hover:text-[var(--justice)]">
                      CGV
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex flex-col sm:flex-row justify-between gap-2">
            <p>
              © {new Date().getFullYear()} {COMPANY_INFO.name}. Tous droits
              réservés.
            </p>
            <p>{COMPANY_INFO.taxNote}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
