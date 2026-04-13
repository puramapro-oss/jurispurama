'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Affirmation from '@/components/shared/Affirmation'
import { formatDate } from '@/lib/utils'

interface GratitudeEntry {
  id: string
  content: string
  created_at: string
}

export default function GratitudePage() {
  const [entries, setEntries] = useState<GratitudeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/gratitude')
      if (!res.ok) throw new Error()
      const json = await res.json()
      setEntries(json.entries ?? [])
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const submit = async () => {
    if (!content.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/gratitude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? 'Erreur.')
        return
      }
      toast.success('Merci pour cette gratitude !')
      setContent('')
      fetchEntries()
    } catch {
      toast.error('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--text-primary)]">
            Journal de gratitude
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Prends un instant pour noter ce dont tu es reconnaissant(e)
            aujourd'hui.
          </p>
        </div>

        <Affirmation />

        {/* New entry */}
        <Card>
          <div className="p-6">
            <h2 className="font-serif text-lg font-semibold text-[var(--text-primary)]">
              De quoi es-tu reconnaissant(e) aujourd'hui ?
            </h2>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-3 w-full resize-none rounded-xl border border-[var(--border)] bg-white/60 px-4 py-3 text-sm text-[var(--text-primary)] focus:border-[var(--justice)] focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">
                {content.length}/500
              </span>
              <Button onClick={submit} disabled={!content.trim() || submitting}>
                {submitting ? 'Envoi…' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </Card>

        {/* History */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 font-serif text-lg font-semibold text-[var(--text-primary)]">
              Mes gratitudes
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-white/5"
                  />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                Aucune entrée. Commence par écrire ta première gratitude !
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-xl border border-[var(--border)] bg-white/30 px-4 py-3"
                  >
                    <p className="text-sm text-[var(--text-primary)]">
                      {e.content}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {formatDate(e.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
