import type { Metadata } from 'next'
import Link from 'next/link'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import Reveal from '@/components/landing/Reveal'

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

function StepVisual({ visual }: { visual: Step['visual'] }) {
  if (visual === 'chat') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          JurisIA
        </div>
        <div className="mb-2 ml-auto max-w-[82%] rounded-2xl rounded-tr-sm bg-[var(--justice-light)]/40 px-4 py-2.5 text-sm text-white">
          J&apos;ai reçu une amende de stationnement hier...
        </div>
        <div className="mt-3 flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--gold)] text-xs">
            ⚖️
          </div>
          <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/85">
            Je regarde tout de suite. Tu peux me dire le montant et le motif sur le
            PV ?
          </div>
        </div>
      </div>
    )
  }
  if (visual === 'analyse') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          Analyse juridique
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-white/70">Domaine</span>
            <span className="font-semibold text-white">Code de la route</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-white/70">Article applicable</span>
            <span className="font-semibold text-[var(--gold-light)]">R417-10</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-2">
            <span className="text-white/70">Chances de succès</span>
            <span className="font-semibold text-[var(--gold-light)]">78 %</span>
          </div>
        </div>
      </div>
    )
  }
  if (visual === 'suivi') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          Plan d&apos;action
        </div>
        <ol className="space-y-2.5 text-sm text-white/80">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-light)]">
              1
            </span>
            <span>Photographier le panneau (45 j max)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-light)]">
              2
            </span>
            <span>Requête en exonération ANTAI</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-light)]">
              3
            </span>
            <span>Joindre preuves photographiques</span>
          </li>
        </ol>
      </div>
    )
  }
  if (visual === 'doc') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[var(--gold)]">
            📄
          </div>
          <div className="text-sm font-semibold text-white">
            Contestation-amende.pdf
          </div>
        </div>
        <div className="space-y-1.5 rounded-lg bg-black/30 p-3 text-xs text-white/60">
          <div className="h-1.5 w-3/4 rounded bg-white/15" />
          <div className="h-1.5 w-full rounded bg-white/12" />
          <div className="h-1.5 w-5/6 rounded bg-white/10" />
          <div className="h-1.5 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-1.5 w-1/2 rounded bg-[var(--gold)]/40" />
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wider text-white/40">
          Article R417-10 · Code de la route
        </div>
      </div>
    )
  }
  if (visual === 'signature') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          Signature électronique
        </div>
        <div className="flex h-20 items-end justify-center rounded-xl border border-[var(--gold)]/30 bg-white/5 p-3">
          <svg
            viewBox="0 0 200 40"
            className="h-full w-full"
            aria-hidden="true"
          >
            <path
              d="M10,30 Q 30,5 50,20 T 100,25 Q 130,30 150,10 T 190,22"
              stroke="#C9A84C"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wider text-white/45">
          Art. 1366 CC · SHA-256 vérifié
        </div>
      </div>
    )
  }
  // envoi
  return (
    <div className="glass-dark rounded-2xl p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
        Envoi en cours
      </div>
      <div className="space-y-2">
        {[
          { label: 'Document généré', done: true },
          { label: 'Signature horodatée', done: true },
          { label: 'Envoi AR24 confirmé', done: true },
          { label: 'Accusé de réception', done: false },
        ].map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                s.done
                  ? 'bg-[var(--gold)] text-[var(--justice-dark)]'
                  : 'border border-white/30 text-white/40'
              }`}
            >
              {s.done ? '✓' : '·'}
            </span>
            <span className={s.done ? 'text-white' : 'text-white/50'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
