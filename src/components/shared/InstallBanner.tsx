'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'jurispurama-install-dismissed'

export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY)
      if (dismissed) {
        const until = Number(dismissed)
        if (Number.isFinite(until) && until > Date.now()) return
      }
    } catch {
      /* ignore */
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const onInstall = async (): Promise<void> => {
    if (!deferred) return
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      /* user cancelled */
    }
    setVisible(false)
    setDeferred(null)
  }

  const onDismiss = (): void => {
    try {
      // Dismiss for 14 days
      localStorage.setItem(
        DISMISSED_KEY,
        String(Date.now() + 14 * 24 * 3600 * 1000)
      )
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Installer JurisPurama"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-white/15 bg-[#0A0E1A]/95 p-4 shadow-2xl backdrop-blur-xl md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--justice)] to-[var(--gold)] text-xl">
          ⚖️
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">
            Installer JurisPurama
          </p>
          <p className="mt-0.5 text-xs text-white/65">
            Accède à ton avocat IA en un clic depuis ton écran d&apos;accueil.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fermer"
          className="text-white/50 hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onInstall}
          className="flex-1 rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] px-4 py-2 text-sm font-semibold text-[var(--justice-dark)] transition hover:brightness-105"
        >
          Installer
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/5"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
