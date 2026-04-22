import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'image.pollinations.ai' },
      { protocol: 'https', hostname: 'auth.purama.dev' },
    ],
  },
  async redirects() {
    // V7.1 §15 : "Influenceur" INTERDIT dans l'UI → "Ambassadeur" partout.
    // Les anciennes URLs restent accessibles pour backward compat (emails partis, liens existants).
    return [
      { source: '/influenceur', destination: '/ambassadeur', permanent: true },
      { source: '/apply/influenceur', destination: '/apply/ambassadeur', permanent: true },
      { source: '/admin/influenceurs', destination: '/admin/ambassadeurs', permanent: true },
    ]
  },
}

export default nextConfig
