import type { Metadata } from 'next'
import Link from 'next/link'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import Reveal from '@/components/landing/Reveal'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    "Bientôt : articles juridiques pratiques, guides par situation et actualités du droit français vulgarisées par JurisPurama.",
  alternates: {
    canonical: `https://${APP_DOMAIN}/blog`,
  },
  openGraph: {
    title: `Blog — ${APP_NAME}`,
    description:
      "Guides juridiques pratiques et actualités du droit, vulgarisées.",
    url: `https://${APP_DOMAIN}/blog`,
  },
}

const TEASERS = [
  {
    title: 'Comment contester une amende de stationnement en 2026',
    excerpt:
      "Le guide complet : délais, preuves acceptées, formulaire ANTAI, articles applicables. Tout ce qu'il faut savoir pour ne pas payer une amende injuste.",
    category: 'Amendes',
    readTime: '7 min',
  },
  {
    title: 'Récupérer son dépôt de garantie : la méthode qui marche',
    excerpt:
      "Le propriétaire fait la sourde oreille ? On t'explique comment utiliser les pénalités légales de 10 % par mois et obtenir satisfaction en moins de 3 semaines.",
    category: 'Logement',
    readTime: '9 min',
  },
  {
    title: 'Solde de tout compte impayé : tes recours en 2026',
    excerpt:
      "Ton ancien employeur traîne des pieds ? Mise en demeure, conseil de prud'hommes, saisie — toutes les étapes expliquées simplement.",
    category: 'Travail',
    readTime: '11 min',
  },
]

export default function BlogPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <section className="relative pb-16">
          <div className="container-wide">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                Blog
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
                Le droit, sans jargon
              </h1>
              <p className="mt-5 text-white/70 md:text-lg">
                Bientôt disponible : des guides pratiques par situation, rédigés
                par JurisIA et relus par des juristes. En attendant, voici ce
                qu&apos;on prépare.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--gold-light)]">
                🚧 Lancement prévu Q2 2026
              </div>
            </Reveal>
          </div>
        </section>

        <section className="relative pb-24">
          <div className="container-wide">
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
              {TEASERS.map((t, i) => (
                <Reveal key={t.title} delay={i * 0.08}>
                  <article className="glass-dark relative h-full rounded-3xl p-7">
                    <span className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                      À venir
                    </span>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--gold-light)]">
                      {t.category}
                    </div>
                    <h2 className="font-serif text-xl font-semibold leading-tight text-white">
                      {t.title}
                    </h2>
                    <p className="mt-3 text-sm text-white/65">{t.excerpt}</p>
                    <div className="mt-5 text-xs text-white/40">{t.readTime} de lecture</div>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.3} className="mx-auto mt-16 max-w-xl text-center">
              <p className="text-white/70">
                En attendant le blog, tu peux déjà utiliser JurisIA pour poser
                directement tes questions juridiques.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-6 text-sm font-semibold text-[var(--justice-dark)]"
              >
                Essayer JurisPurama
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
