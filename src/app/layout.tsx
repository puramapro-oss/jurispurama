import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
import ThemeScript from '@/components/shared/ThemeScript'
import ServiceWorkerRegister from '@/components/shared/ServiceWorkerRegister'
import InstallBanner from '@/components/shared/InstallBanner'
import { APP_NAME, APP_TAGLINE, APP_DOMAIN } from '@/lib/constants'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "JurisPurama est l'assistant juridique IA le plus complet de France. Raconte ton problème, obtiens un plan d'action, des documents prêts à signer et envoie un recommandé AR en 3 clics. 12 domaines du droit couverts.",
  metadataBase: new URL(`https://${APP_DOMAIN}`),
  manifest: '/manifest.json',
  applicationName: APP_NAME,
  authors: [{ name: 'SASU PURAMA' }],
  creator: 'SASU PURAMA',
  publisher: 'SASU PURAMA',
  keywords: [
    'assistant juridique IA',
    'avocat en ligne',
    'contestation amende',
    'droit du travail',
    'mise en demeure',
    'litige logement',
    'recommandé électronique',
    'signature électronique',
    'droit français',
    'JurisPurama',
  ],
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "L'assistant juridique IA qui rédige, signe et envoie tes documents à ta place. 12 domaines du droit français couverts.",
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
      "Raconte ton problème, JurisIA rédige et envoie. 12 domaines du droit.",
    images: [
      `https://${APP_DOMAIN}/api/og?title=${encodeURIComponent(APP_TAGLINE)}`,
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: `https://${APP_DOMAIN}`,
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  category: 'legal',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1E3A5F' },
    { media: '(prefers-color-scheme: dark)', color: '#05070F' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  colorScheme: 'dark light',
}

const ORG_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SASU PURAMA',
  url: `https://${APP_DOMAIN}`,
  logo: `https://${APP_DOMAIN}/icon.svg`,
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'contact@purama.dev',
    contactType: 'customer support',
    availableLanguage: ['French', 'English', 'Spanish'],
  },
  address: {
    '@type': 'PostalAddress',
    streetAddress: '8 Rue de la Chapelle',
    postalCode: '25560',
    addressLocality: 'Frasne',
    addressCountry: 'FR',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="fr"
      className={`${cormorant.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSON_LD) }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-[var(--gold)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--justice-dark)]"
        >
          Aller au contenu principal
        </a>
        <ErrorBoundary>
          <div id="main-content">{children}</div>
        </ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(30,58,95,0.12)',
              color: '#0F172A',
            },
          }}
        />
        <ServiceWorkerRegister />
        <InstallBanner />
      </body>
    </html>
  )
}
