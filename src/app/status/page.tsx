import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import StatusClient from './StatusClient'

export const metadata: Metadata = {
  title: 'Statut des services',
  description:
    'Statut en temps réel de JurisPurama et de ses dépendances — API, base de données, authentification, paiements, emails.',
  alternates: {
    canonical: `https://${APP_DOMAIN}/status`,
  },
  openGraph: {
    title: `Statut — ${APP_NAME}`,
    description: 'Suivi en temps réel de la santé de nos services.',
    url: `https://${APP_DOMAIN}/status`,
  },
}

export default function StatusPage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <StatusClient />
      </main>
      <LandingFooter />
    </div>
  )
}
