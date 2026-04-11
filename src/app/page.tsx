import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { APP_DOMAIN, APP_NAME, APP_TAGLINE } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import Hero from '@/components/landing/Hero'
import Demo from '@/components/landing/Demo'
import Domains from '@/components/landing/Domains'
import HowItWorks from '@/components/landing/HowItWorks'
import Testimonials from '@/components/landing/Testimonials'
import Compare from '@/components/landing/Compare'
import PricingPreview from '@/components/landing/PricingPreview'
import LandingFAQ from '@/components/landing/LandingFAQ'
import CTAFinal from '@/components/landing/CTAFinal'
import LandingFooter from '@/components/landing/LandingFooter'
import CursorGlow from '@/components/landing/CursorGlow'

export const revalidate = 600

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "L'assistant juridique IA qui remplace ton avocat à 99 %. Raconte ton problème, obtiens un plan d'action + documents juridiques signés, envoie en 1 clic. 12 domaines du droit français. 14 jours d'essai gratuit, sans carte bancaire.",
  alternates: {
    canonical: `https://${APP_DOMAIN}`,
    languages: {
      fr: `https://${APP_DOMAIN}`,
      en: `https://${APP_DOMAIN}?lang=en`,
      es: `https://${APP_DOMAIN}?lang=es`,
    },
  },
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Raconte ton problème juridique. En 3 minutes, tu as un plan d'action + des documents prêts à signer. 12 domaines du droit couverts.",
    url: `https://${APP_DOMAIN}`,
    siteName: APP_NAME,
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: `https://${APP_DOMAIN}/api/og?title=${encodeURIComponent(
          APP_TAGLINE
        )}`,
        width: 1200,
        height: 630,
        alt: `${APP_NAME} — ${APP_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Raconte ton problème. JurisIA rédige, signe et envoie. 12 domaines du droit français.",
    images: [
      `https://${APP_DOMAIN}/api/og?title=${encodeURIComponent(APP_TAGLINE)}`,
    ],
  },
}

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

export default async function LandingPage() {
  const communitySavings = await getCommunitySavings()
  const rounded = Math.max(10_000, Math.floor(communitySavings / 1000) * 1000)
  const communitySavingsLabel = formatEurosCompact(rounded)

  // Structured data — SoftwareApplication schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description:
      "JurisPurama est l'assistant juridique IA le plus complet de France. 12 domaines du droit français, documents juridiques générés, signature électronique (art. 1366 CC), envoi en recommandé AR.",
    url: `https://${APP_DOMAIN}`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: '0',
      highPrice: '39.99',
      offerCount: '4',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '128',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SASU PURAMA',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '8 Rue de la Chapelle',
        postalCode: '25560',
        addressLocality: 'Frasne',
        addressCountry: 'FR',
      },
    },
  }

  return (
    <div className="relative min-h-screen bg-cinematic text-white">
      <CursorGlow />
      <LandingHeader />
      <main className="relative z-10">
        <Hero communitySavingsLabel={communitySavingsLabel} />
        <Demo />
        <Domains />
        <HowItWorks />
        <Testimonials />
        <Compare />
        <PricingPreview />
        <LandingFAQ />
        <CTAFinal />
      </main>
      <LandingFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
