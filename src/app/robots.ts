import type { MetadataRoute } from 'next'
import { APP_DOMAIN } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  const base = `https://${APP_DOMAIN}`
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/api/', '/auth/', '/dossiers/', '/profil/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
