'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface NotificationRow {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

function ago(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.round(hours / 24)
  return `il y a ${days} j`
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as {
        notifications: NotificationRow[]
        unread: number
      }
      setItems(data.notifications ?? [])
      setUnread(data.unread ?? 0)
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [open])

  const markAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allRead: true }),
      })
      setUnread(0)
      setItems((prev) =>
        prev.map((n) =>
          n.read_at ? n : { ...n, read_at: new Date().toISOString() }
        )
      )
    } catch {
      // silent
    }
  }, [])

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--justice)] hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/40"
      >
        <span aria-hidden="true" className="text-xl">
          🔔
        </span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <p className="font-serif text-base font-semibold text-[var(--justice)]">
              Notifications
            </p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-[var(--justice)] hover:underline"
              >
                Tout marquer lu
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">
                Aucune notification pour l&apos;instant.
              </div>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {items.slice(0, 10).map((n) => {
                  const content = (
                    <div
                      className={`block px-4 py-3 transition-colors ${
                        n.read_at
                          ? 'bg-white'
                          : 'bg-[var(--gold)]/5'
                      } hover:bg-[var(--justice)]/5`}
                    >
                      <div className="flex items-start gap-3">
                        {!n.read_at && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--gold)]"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--justice)]">
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-secondary)]">
                              {n.message}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                            {ago(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => setOpen(false)}>
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
