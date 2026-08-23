import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  transpilePackages: ['@purama/smarana'],
  experimental: { externalDir: true },
  outputFileTracingRoot: path.join(__dirname, '..'),
  turbopack: {
    root: path.join(__dirname, '..'),
    resolveAlias: {
      '@purama/smarana': '../packages/smarana/src/index.ts',
    },
  },
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
