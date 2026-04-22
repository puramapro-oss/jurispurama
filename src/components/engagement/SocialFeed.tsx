'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

interface FeedEvent {
  id: string
  event_type: string
  display_first_name: string | null
  display_message: string
  created_at: string
}

const ICONS: Record<string, string> = {
  tier_unlocked: '⭐',
  withdrawal: '💰',
  streak_milestone: '🔥',
  nature_score: '🌿',
  referral_milestone: '🎁',
  case_resolved: '⚖️',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

/**
 * SocialFeed — V7.1 §20 Wealth Engine
 * Événements communauté SANS montants exacts → FOMO sain.
 * "[Prénom] a débloqué son palier Or" / "vient d'atteindre 30 jours de streak"
 */
export default function SocialFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/social-feed', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((data) => setEvents(data.events ?? []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="p-6">
      <h3 className="font-serif text-lg font-semibold text-[var(--justice)] mb-4 flex items-center gap-2">
        <span>🌐</span>
        <span>La communauté Purama</span>
      </h3>
      {loading && (
        <p className="text-sm text-[var(--text-muted)]">Chargement du feed…</p>
      )}
      {!loading && events.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Le feed s&apos;anime dès que des membres décrochent leurs premiers paliers.
        </p>
      )}
      {events.length > 0 && (
        <ul className="space-y-2.5 max-h-[320px] overflow-y-auto -mr-2 pr-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 text-sm py-1.5 border-b border-[var(--border)] last:border-0"
            >
              <span className="text-lg shrink-0" aria-hidden>
                {ICONS[e.event_type] ?? '✨'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)]">
                  <strong className="text-[var(--justice)]">
                    {e.display_first_name ?? 'Un membre'}
                  </strong>{' '}
                  {e.display_message}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {timeAgo(e.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
