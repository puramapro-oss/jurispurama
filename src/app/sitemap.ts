import type { MetadataRoute } from 'next'
import { APP_DOMAIN } from '@/lib/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = `https://${APP_DOMAIN}`
  const now = new Date()

  const staticRoutes: Array<{
    path: string
    freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
    priority: number
  }> = [
    { path: '', freq: 'weekly', priority: 1.0 },
    { path: '/pricing', freq: 'weekly', priority: 0.9 },
    { path: '/how-it-works', freq: 'weekly', priority: 0.9 },
    { path: '/ecosystem', freq: 'monthly', priority: 0.7 },
    { path: '/aide', freq: 'weekly', priority: 0.8 },
    { path: '/contact', freq: 'monthly', priority: 0.6 },
    { path: '/changelog', freq: 'monthly', priority: 0.5 },
    { path: '/status', freq: 'daily', priority: 0.4 },
    { path: '/blog', freq: 'weekly', priority: 0.6 },
    { path: '/login', freq: 'monthly', priority: 0.5 },
    { path: '/signup', freq: 'monthly', priority: 0.8 },
    { path: '/mentions-legales', freq: 'yearly', priority: 0.3 },
    { path: '/politique-confidentialite', freq: 'yearly', priority: 0.3 },
    { path: '/cgv', freq: 'yearly', priority: 0.3 },
    { path: '/cgu', freq: 'yearly', priority: 0.3 },
    { path: '/cookies', freq: 'yearly', priority: 0.3 },
  ]

  return staticRoutes.map((r) => ({
    url: `${base}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }))
}
