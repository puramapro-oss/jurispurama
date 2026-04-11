import type { Metadata } from 'next'
import { APP_DOMAIN, APP_NAME, APP_TAGLINE } from '@/lib/constants'
import LandingHeader from '@/components/landing/LandingHeader'
import Hero from '@/components/landing/Hero'
import Demo from '@/components/landing/Demo'
import Domains from '@/components/landing/Domains'
import HowItWorks from '@/components/landing/HowItWorks'
import Trust from '@/components/landing/Trust'
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
    "L'assistant juridique IA qui décrypte le droit français pour toi. Décris ton problème, obtiens un plan d'action sourcé, des documents prêts à signer et un envoi en recommandé électronique. 14 jours d'essai sans carte bancaire.",
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
      "Décris ton problème juridique. JurisIA identifie les articles applicables, rédige tes courriers et te guide jusqu'au résultat.",
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
      "Assistant juridique IA fondé sur le droit français. Articles cités, documents signables, recommandé AR24.",
    images: [
      `https://${APP_DOMAIN}/api/og?title=${encodeURIComponent(APP_TAGLINE)}`,
    ],
  },
}

export default function LandingPage() {
  // Structured data — SoftwareApplication schema (sans aggregateRating fictive)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: APP_NAME,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web, iOS, Android',
    description:
      "JurisPurama est un assistant juridique IA fondé sur le droit français. 12 grands domaines couverts, articles de loi systématiquement cités, documents signables (art. 1366 CC), envoi en recommandé électronique AR24.",
    url: `https://${APP_DOMAIN}`,
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice: '0',
      highPrice: '39.99',
      offerCount: '4',
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
    <div className="relative min-h-screen overflow-x-hidden bg-cinematic text-white">
      <CursorGlow />
      <LandingHeader />
      <main className="relative z-10">
        <Hero />
        <Demo />
        <Domains />
        <HowItWorks />
        <Trust />
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
