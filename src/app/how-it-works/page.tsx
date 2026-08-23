import type { Metadata } from 'next'
import Link from 'next/link'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import Reveal from '@/components/landing/Reveal'
import StepVisual from './StepVisual'

export const metadata: Metadata = {
  title: 'Comment ça marche',
  description:
    'Découvre en 6 étapes comment JurisPurama transforme ton problème juridique en plan d\'action, documents prêts à signer et envoi en recommandé électronique.',
  alternates: {
    canonical: `https://${APP_DOMAIN}/how-it-works`,
  },
  openGraph: {
    title: `Comment ça marche — ${APP_NAME}`,
    description:
      'Le processus complet de JurisPurama : de ton problème à la solution, en 6 étapes visuelles.',
    url: `https://${APP_DOMAIN}/how-it-works`,
  },
}

interface Step {
  n: string
  title: string
  description: string
  visual: 'chat' | 'analyse' | 'doc' | 'signature' | 'envoi' | 'suivi'
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Raconte ton problème en langage naturel',
    description:
      "Ouvre le chat JurisIA depuis ton tableau de bord. Décris ta situation comme à un ami — pas de jargon, pas de formulaire interminable. JurisIA comprend le français courant, les dates, les montants, les acteurs impliqués.",
    visual: 'chat',
  },
  {
    n: '02',
    title: 'JurisIA identifie les lois applicables',
    description:
      "En moins de 30 secondes, JurisIA catégorise ton problème dans l'un des 12 domaines du droit français, cite les articles applicables (Code civil, Code du travail, Code de la consommation, etc.) et évalue tes chances de succès.",
    visual: 'analyse',
  },
  {
    n: '03',
    title: 'Un plan d’action numéroté, chiffré',
    description:
      "Tu reçois un plan étape par étape avec les délais légaux, les risques, les documents nécessaires et une estimation des sommes en jeu. Tu choisis la stratégie qui te convient — JurisIA propose toujours plusieurs options.",
    visual: 'suivi',
  },
  {
    n: '04',
    title: 'Génération automatique des documents',
    description:
      "Contestation d'amende, mise en demeure, lettre de réclamation, plainte RGPD... JurisIA rédige le document parfaitement conforme, avec les formules juridiques exactes et les articles de loi référencés.",
    visual: 'doc',
  },
  {
    n: '05',
    title: 'Signature électronique en 1 geste',
    description:
      "Signature sur canvas tactile (doigt ou stylet), horodatée et hachée SHA-256. Valeur juridique totale selon l'article 1366 du Code civil. Chaque signature est vérifiable publiquement via un lien unique.",
    visual: 'signature',
  },
  {
    n: '06',
    title: 'Envoi et suivi en temps réel',
    description:
      "Email avec accusé de lecture (gratuit) ou recommandé électronique AR24 (5,99 € ou inclus Pro+). Tu suis l'état de l'envoi en temps réel depuis ton espace — notifications push, email, timeline visuelle.",
    visual: 'envoi',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <section className="relative pb-16">
          <div className="container-wide">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                Comment ça marche
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
                Ton avocat IA, de A à Z
              </h1>
              <p className="mt-5 text-white/70 md:text-lg">
                De la première question à l&apos;accusé de réception de ton
                recommandé — découvre comment JurisPurama gère tout ton dossier
                juridique sans que tu aies besoin de comprendre le droit.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="relative py-10">
          <div className="container-wide">
            <div className="mx-auto max-w-5xl space-y-20 md:space-y-28">
              {STEPS.map((step, i) => (
                <Reveal key={step.n}>
                  <div
                    className={`grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16 ${
                      i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
                    }`}
                  >
                    <div>
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--gold-light)]">
                        Étape {step.n}
                      </div>
                      <h2 className="font-serif text-3xl font-semibold leading-tight text-white md:text-4xl">
                        {step.title}
                      </h2>
                      <p className="mt-4 text-white/70 md:text-lg">
                        {step.description}
                      </p>
                    </div>
                    <StepVisual visual={step.visual} />
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="relative py-24">
          <div className="container-wide">
            <Reveal className="mx-auto max-w-3xl text-center">
              <h2 className="font-serif text-3xl font-semibold italic leading-tight text-white md:text-4xl">
                Prêt à ouvrir ton premier dossier ?
              </h2>
              <p className="mt-4 text-white/65">
                14 jours gratuits, sans carte bancaire, annulation en 1 clic.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-8 text-base font-semibold text-[var(--justice-dark)] shadow-2xl shadow-[rgba(201,168,76,0.35)]"
              >
                Essayer gratuitement
              </Link>
            </Reveal>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
