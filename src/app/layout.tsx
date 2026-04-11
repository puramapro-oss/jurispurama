import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import ErrorBoundary from '@/components/shared/ErrorBoundary'
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
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "JurisPurama est l'assistant juridique IA le plus complet de France. Raconte ton problème, obtiens un plan d'action, des documents prêts à signer et envoie un recommandé AR en 3 clics. 12 domaines du droit couverts.",
  metadataBase: new URL(`https://${APP_DOMAIN}`),
  manifest: '/manifest.json',
  applicationName: APP_NAME,
  authors: [{ name: 'SASU PURAMA' }],
  keywords: [
    'assistant juridique IA',
    'avocat en ligne',
    'contestation amende',
    'droit du travail',
    'mise en demeure',
    'litige logement',
    'recommandé électronique',
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
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description:
      "Raconte ton problème, JurisIA rédige et envoie. 12 domaines du droit.",
  },
  robots: { index: true, follow: true },
  alternates: {
    canonical: `https://${APP_DOMAIN}`,
  },
}

export const viewport: Viewport = {
  themeColor: '#1E3A5F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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
      <body className="min-h-screen bg-parchment antialiased">
        <ErrorBoundary>{children}</ErrorBoundary>
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
      </body>
    </html>
  )
}
