import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import LandingFooter from '@/components/landing/LandingFooter'
import AideClient from './AideClient'

export const metadata: Metadata = {
  title: 'Aide et FAQ',
  description:
    'Centre d\'aide JurisPurama : réponses aux questions fréquentes sur ton compte, tes dossiers, tes documents, les paiements, la sécurité et le parrainage.',
  alternates: {
    canonical: `https://${APP_DOMAIN}/aide`,
  },
  openGraph: {
    title: `Aide — ${APP_NAME}`,
    description:
      'FAQ complète, recherche fuzzy et assistant IA en direct pour toutes tes questions sur JurisPurama.',
    url: `https://${APP_DOMAIN}/aide`,
  },
}

export default function AidePage() {
  return (
    <div className="bg-cinematic relative min-h-screen text-white">
      <LandingHeader />
      <main className="relative z-10 pt-28 md:pt-36">
        <AideClient />
      </main>
      <LandingFooter />
    </div>
  )
}
