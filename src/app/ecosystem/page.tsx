import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import { PURAMA_APPS } from '@/lib/ecosystem'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import Reveal from '@/components/landing/Reveal'

export const metadata: Metadata = {
  title: 'Écosystème Purama',
  description:
    "JurisPurama fait partie de l'écosystème Purama — une suite d'assistants IA premium : juridique, finance, santé, langues, cinéma, comptabilité. Un seul compte, un seul wallet de récompenses.",
  alternates: {
    canonical: `https://${APP_DOMAIN}/ecosystem`,
  },
  openGraph: {
    title: `Écosystème Purama — ${APP_NAME}`,
    description:
      "Découvre les 8 applications Purama — la suite d'assistants IA qui te libère de la bureaucratie, des contraintes et du temps perdu.",
    url: `https://${APP_DOMAIN}/ecosystem`,
  },
}

export default function EcosystemPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        {/* Hero */}
        <section className="relative pb-12">
          <div className="container-wide">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                L&apos;écosystème
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
                Une suite d&apos;IA, un seul compte
              </h1>
              <p className="mt-5 text-white/70 md:text-lg">
                JurisPurama fait partie de Purama — un écosystème de 8 assistants
                IA spécialisés. Un compte unique, un wallet de récompenses partagé,
                et des cross-promos intelligentes entre toutes les apps.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Apps grid */}
        <section className="relative py-16">
          <div className="container-wide">
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {PURAMA_APPS.map((app, i) => (
                <Reveal key={app.slug} delay={i * 0.05}>
                  <a
                    href={app.url}
                    target={
                      app.slug === 'jurispurama' ? undefined : '_blank'
                    }
                    rel={
                      app.slug === 'jurispurama'
                        ? undefined
                        : 'noopener noreferrer'
                    }
                    className="glass-dark group relative block h-full overflow-hidden rounded-3xl p-7 transition hover:-translate-y-1 hover:border-[var(--gold)]/40"
                  >
                    {app.slug === 'jurispurama' && (
                      <span className="absolute right-4 top-4 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--gold-light)]">
                        Tu es ici
                      </span>
                    )}
                    <div
                      className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${app.color}33 0%, ${app.color}0d 100%)`,
                        border: `1px solid ${app.color}55`,
                      }}
                    >
                      {app.icon}
                    </div>
                    <h3
                      className="font-serif text-2xl font-semibold"
                      style={{ color: app.color }}
                    >
                      {app.name}
                    </h3>
                    <p className="mt-1 font-serif text-sm italic text-white/60">
                      {app.tagline}
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-white/70">
                      {app.description}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-white/55 transition group-hover:text-[var(--gold)]">
                      Découvrir
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        aria-hidden="true"
                        className="transition group-hover:translate-x-0.5"
                      >
                        <path d="M5 12h14" />
                        <path d="M13 5l7 7-7 7" />
                      </svg>
                    </div>
                  </a>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Why an ecosystem */}
        <section className="relative py-20">
          <div className="container-wide">
            <Reveal className="mx-auto max-w-4xl">
              <div className="glass-dark rounded-3xl p-8 md:p-12">
                <h2 className="font-serif text-3xl font-semibold italic leading-tight text-white md:text-4xl">
                  Pourquoi un écosystème ?
                </h2>
                <p className="mt-5 text-white/75 md:text-lg">
                  Parce que ta vie ne se réduit pas à un seul besoin. Tu as un
                  problème juridique aujourd&apos;hui, mais demain ce sera ta
                  santé, tes finances, ta comptabilité, ton apprentissage.
                  L&apos;écosystème Purama te garantit une expérience cohérente
                  entre toutes ces briques — même compte, mêmes valeurs, même
                  qualité.
                </p>
                <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
                  {[
                    {
                      title: 'Un seul compte',
                      desc: "Connecte-toi une fois, accède à toutes les apps Purama. Tes préférences, ton wallet, tes récompenses — synchronisés partout.",
                      icon: '🔑',
                    },
                    {
                      title: 'Récompenses partagées',
                      desc: "Gagne des points Purama sur une app, dépense-les sur une autre. Parrainage cumulatif : un filleul sur JurisPurama compte aussi sur MIDAS.",
                      icon: '🎁',
                    },
                    {
                      title: 'Cross-promos -50 %',
                      desc: "Utilisateur JurisPurama ? Tu débloques -50 % sur ton premier mois d'abonnement à toutes les autres apps Purama.",
                      icon: '⚡',
                    },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="text-2xl">{f.icon}</div>
                      <h3 className="mt-3 font-serif text-lg font-semibold text-white">
                        {f.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-white/65">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
