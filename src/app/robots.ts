import type { MetadataRoute } from 'next'
import { APP_DOMAIN } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  const base = `https://${APP_DOMAIN}`
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/og'],
        disallow: [
          '/dashboard/',
          '/api/',
          '/auth/',
          '/dossiers/',
          '/profil/',
          '/scanner/',
          '/documents/',
          '/admin/',
          '/chat/',
          '/abonnement/',
          '/ambassadeur/',
          '/apply/',
          '/verify/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
