import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Contacte l\'équipe JurisPurama — pour toute question, demande commerciale ou presse. Réponse sous 24h ouvrées.',
  alternates: {
    canonical: `https://${APP_DOMAIN}/contact`,
  },
  openGraph: {
    title: `Contact — ${APP_NAME}`,
    description: 'Une question ? Notre équipe répond sous 24h ouvrées.',
    url: `https://${APP_DOMAIN}/contact`,
  },
}

export default function ContactPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <section className="relative pb-20">
          <div className="container-wide">
            <div className="mx-auto max-w-xl text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--gold)]">
                Contact
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold italic leading-tight text-white md:text-6xl">
                On est là pour toi
              </h1>
              <p className="mt-5 text-white/70 md:text-lg">
                Une question commerciale, un bug, une remarque, une demande presse ?
                Écris-nous — on répond sous 24h ouvrées, toujours par un humain ou
                une IA honnête.
              </p>
            </div>

            <div className="mx-auto mt-12 max-w-xl">
              <ContactForm />
            </div>

            <div className="mx-auto mt-12 max-w-xl space-y-3 text-center text-sm text-white/55">
              <p>
                Email direct :{' '}
                <a
                  href="mailto:contact@purama.dev"
                  className="text-[var(--gold-light)] underline"
                >
                  contact@purama.dev
                </a>
              </p>
              <p>DPO (RGPD) : matiss.frasne@gmail.com</p>
              <p className="text-xs text-white/40">
                SASU PURAMA · 8 Rue de la Chapelle · 25560 Frasne · France
              </p>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
