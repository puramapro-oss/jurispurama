import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: 'Tarifs',
  description:
    "Des plans simples et transparents pour accéder à JurisPurama. À partir de 9,99 € par mois. 14 jours d'essai gratuit, sans carte bancaire, annulation en 1 clic.",
  alternates: {
    canonical: `https://${APP_DOMAIN}/pricing`,
  },
  openGraph: {
    title: `Tarifs — ${APP_NAME}`,
    description:
      "4 plans adaptés à tous les besoins. Gratuit, Essentiel, Pro, Avocat Virtuel. 14 jours d'essai gratuit sans carte bancaire.",
    url: `https://${APP_DOMAIN}/pricing`,
    images: [
      {
        url: `https://${APP_DOMAIN}/api/og?title=${encodeURIComponent(
          'Tarifs JurisPurama'
        )}`,
        width: 1200,
        height: 630,
      },
    ],
  },
}

export default function PricingPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <PricingClient />
      </main>
      <LandingFooter />
    </div>
  )
}
