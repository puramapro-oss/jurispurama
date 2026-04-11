import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import { APP_DOMAIN, APP_NAME } from '@/lib/constants'

export const revalidate = 60

interface PageProps {
  params: Promise<{ slug: string }>
}

interface SocialLinks {
  instagram?: string
  tiktok?: string
  youtube?: string
  twitter?: string
  linkedin?: string
}

async function loadInfluencer(slug: string) {
  const clean = slug.replace(/[^a-zA-Z0-9\-]/g, '').slice(0, 60).toLowerCase()
  const sb = createServiceClient()
  const { data } = await sb
    .from('jurispurama_influencers')
    .select(
      'id, slug, bio, social_links, audience_size, tier, user_id, approved, created_at'
    )
    .eq('slug', clean)
    .eq('approved', true)
    .maybeSingle()
  if (!data) return null
  const { data: owner } = await sb
    .from('jurispurama_users')
    .select('full_name')
    .eq('id', data.user_id)
    .maybeSingle()
  return { ...data, fullName: owner?.full_name ?? 'Un ambassadeur JurisPurama' }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const influencer = await loadInfluencer(slug)
  if (!influencer) return { title: `${APP_NAME} — Partenaire` }
  return {
    title: `${influencer.fullName} — Partenaire ${APP_NAME}`,
    description: influencer.bio ?? `Ambassadeur officiel de ${APP_NAME}.`,
  }
}

export default async function InfluencerPublicPage({ params }: PageProps) {
  const { slug } = await params
  const influencer = await loadInfluencer(slug)
  if (!influencer) notFound()

  const social = (influencer.social_links ?? {}) as SocialLinks
  const goLink = `https://${APP_DOMAIN}/go/${influencer.slug}`

  const socialEntries: Array<{ label: string; value: string | undefined; icon: string }> = [
    { label: 'Instagram', value: social.instagram, icon: '📸' },
    { label: 'TikTok', value: social.tiktok, icon: '🎵' },
    { label: 'YouTube', value: social.youtube, icon: '▶️' },
    { label: 'Twitter', value: social.twitter, icon: '🐦' },
    { label: 'LinkedIn', value: social.linkedin, icon: '💼' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F7F3E9] via-white to-[#F7F3E9]">
      <main className="container-narrow py-12">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2 text-sm text-[var(--justice)] hover:underline"
          >
            <span className="text-xl">⚖️</span> {APP_NAME}
          </Link>

          <div className="glass rounded-3xl border border-[var(--border)] bg-white/80 p-8 shadow-lg md:p-12">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--gold)] text-3xl font-bold text-white shadow-md">
                {influencer.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
                  Partenaire officiel
                </p>
                <h1 className="font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
                  {influencer.fullName}
                </h1>
              </div>
            </div>

            {influencer.bio && (
              <p className="mb-8 text-base leading-relaxed text-[var(--text-secondary)]">
                {influencer.bio}
              </p>
            )}

            <div className="mb-8 rounded-2xl bg-gradient-to-br from-[var(--justice)] to-[#2B4870] p-6 text-white">
              <p className="text-xs uppercase tracking-wider text-[var(--gold)]">
                Offre spéciale
              </p>
              <p className="mt-2 font-serif text-2xl font-semibold">
                -50% sur ton premier mois
              </p>
              <p className="mt-1 text-sm text-white/80">
                Accès à l&apos;IA juridique JurisIA, génération de documents,
                signature électronique, envoi recommandé — tout ce qu&apos;il
                faut pour te défendre.
              </p>
              <Link
                href={`/go/${influencer.slug}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--justice-dark)] shadow-md transition hover:bg-[var(--gold-dark)] hover:text-white"
              >
                Profiter de l&apos;offre →
              </Link>
            </div>

            {socialEntries.some((s) => s.value) && (
              <div className="mb-6">
                <p className="mb-3 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  Retrouver {influencer.fullName.split(' ')[0]}
                </p>
                <div className="flex flex-wrap gap-2">
                  {socialEntries
                    .filter((s) => s.value)
                    .map((s) => (
                      <a
                        key={s.label}
                        href={
                          s.value!.startsWith('http')
                            ? s.value
                            : `https://${s.value}`
                        }
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm text-[var(--text-primary)] transition hover:border-[var(--justice)] hover:text-[var(--justice)]"
                      >
                        <span>{s.icon}</span>
                        {s.label}
                      </a>
                    ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--parchment)] p-4">
              <p className="mb-2 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Lien direct
              </p>
              <code className="block break-all text-xs text-[var(--text-primary)]">
                {goLink}
              </code>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
            {APP_NAME} — Assistant juridique IA français
          </p>
        </div>
      </main>
    </div>
  )
}
