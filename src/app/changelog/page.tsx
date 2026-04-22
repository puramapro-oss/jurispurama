import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import Reveal from '@/components/landing/Reveal'

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    "Journal des mises à jour de JurisPurama — nouvelles fonctionnalités, améliorations et corrections. Suivi transparent de l'évolution de l'app.",
  alternates: {
    canonical: `https://${APP_DOMAIN}/changelog`,
  },
  openGraph: {
    title: `Changelog — ${APP_NAME}`,
    description: "Toutes les mises à jour de JurisPurama, en transparence.",
    url: `https://${APP_DOMAIN}/changelog`,
  },
}

interface Release {
  version: string
  date: string
  title: string
  features: string[]
  fixes?: string[]
  tag?: 'major' | 'minor' | 'patch'
}

const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: '11 avril 2026',
    title: 'Lancement officiel',
    tag: 'major',
    features: [
      'Landing page premium avec animations framer-motion, cursor glow, aurora animée',
      'Page Tarifs avec toggle mensuel/annuel et tableau comparatif complet',
      'Page Comment ça marche en 6 étapes visuelles',
      'Page Écosystème Purama avec toutes les apps sœurs',
      'Centre d\'aide avec recherche fuzzy et 18+ articles FAQ',
      'Formulaire de contact relié à Resend',
      'Dark mode avec toggle et préférence système',
      'Internationalisation légère fr / en / es',
      'Progressive Web App installable (iOS + Android) avec service worker',
      'SEO complet : meta dynamiques, Open Graph, JSON-LD, sitemap, robots',
      'Image OG dynamique via /api/og (Satori)',
    ],
  },
  {
    version: '0.5.0',
    date: '11 avril 2026',
    title: 'Stripe, parrainage et ambassadeurs',
    tag: 'minor',
    features: [
      '4 plans Stripe (Gratuit, Essentiel, Pro, Avocat Virtuel) + achats unitaires',
      'Webhook Stripe avec gestion complète des cycles d\'abonnement',
      'Système de parrainage avec 6 paliers (Bronze → Légende)',
      'Wallet et retraits IBAN à partir de 5 €',
      'Programme ambassadeurs ouvert avec dashboard dédié',
      'Admin : gestion utilisateurs, paiements, dossiers, ambassadeurs',
      'Commission 50 % premier paiement + 10 % récurrent',
    ],
  },
  {
    version: '0.4.0',
    date: '11 avril 2026',
    title: 'Signature électronique et envois',
    tag: 'minor',
    features: [
      'Signature électronique canvas HTML5 conforme art. 1366 CC',
      'Hash SHA-256 et vérification publique via /verify/[id]',
      'Envoi par email avec accusé de lecture (Resend + templates React Email)',
      'Envoi en recommandé électronique AR24 avec fallback simulation',
      'Timeline visuelle par dossier',
      'Crons deadline-alerts (J-7/J-3/J-1) et check-ar-status',
      'Notifications temps réel avec cloche et dropdown',
    ],
  },
  {
    version: '0.3.0',
    date: '11 avril 2026',
    title: 'Profil juridique, scanner et génération PDF',
    tag: 'minor',
    features: [
      'Profil juridique chiffré AES-256',
      'Scanner OCR via Claude Vision (amendes, contrats, lettres)',
      '7 templates PDF via @react-pdf/renderer',
      'Intégration du profil dans le chat JurisIA pour des réponses personnalisées',
    ],
  },
  {
    version: '0.2.0',
    date: '11 avril 2026',
    title: 'Chat JurisIA et dossiers',
    tag: 'minor',
    features: [
      'Chat JurisIA streaming SSE avec Claude Sonnet',
      'Création automatique de dossiers depuis le chat',
      'Timeline des messages et actions rapides',
      'Pages dossiers filtrables avec détail',
    ],
  },
  {
    version: '0.1.0',
    date: '11 avril 2026',
    title: 'Scaffold initial',
    tag: 'patch',
    features: [
      'Next.js 16 + React 19 + TypeScript strict',
      'Authentification Supabase (email + Google OAuth)',
      'Schéma PostgreSQL avec RLS',
      'Pages légales (mentions, CGV, CGU, politique, cookies)',
      'Landing page MVP, déploiement Vercel',
    ],
  },
]

function tagColor(tag?: Release['tag']): string {
  if (tag === 'major')
    return 'border-[var(--gold)]/50 bg-[var(--gold)]/15 text-[var(--gold-light)]'
  if (tag === 'minor')
    return 'border-[var(--justice-light)]/50 bg-[var(--justice-light)]/15 text-[#9ccbff]'
  return 'border-white/15 bg-white/5 text-white/65'
}

export default function ChangelogPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <section className="relative pb-20">
          <div className="container-wide">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                Changelog
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
                Ce qui change, ce qui s&apos;améliore
              </h1>
              <p className="mt-5 text-white/70 md:text-lg">
                Suivi transparent des mises à jour de JurisPurama. Nous publions
                chaque amélioration, chaque correction, chaque nouvelle
                fonctionnalité.
              </p>
            </Reveal>

            <div className="mx-auto mt-14 max-w-3xl space-y-8">
              {RELEASES.map((r, i) => (
                <Reveal key={r.version} delay={i * 0.05}>
                  <article className="glass-dark rounded-3xl p-8">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tagColor(
                          r.tag
                        )}`}
                      >
                        v{r.version}
                      </span>
                      <span className="text-xs text-white/55">{r.date}</span>
                    </div>
                    <h2 className="font-serif text-2xl font-semibold text-white md:text-3xl">
                      {r.title}
                    </h2>
                    <ul className="mt-5 space-y-2 text-sm text-white/75">
                      {r.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--gold)]" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {r.fixes && r.fixes.length > 0 && (
                      <>
                        <p className="mt-5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                          Corrections
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-white/60">
                          {r.fixes.map((f) => (
                            <li key={f} className="flex items-start gap-2.5">
                              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-white/30" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
