'use client'

import { useEffect, type ReactNode } from 'react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  children: ReactNode
}

/**
 * PuramaSheet — bottom sheet mobile (V7.1 §16)
 * Implémentation minimale sans vaul (évite une dep supplémentaire).
 * Drag-to-dismiss pas implémenté, mais handle visuel + swipe-down via tap
 * backdrop ou bouton close.
 */
export function PuramaSheet({ open, onOpenChange, title, children }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    if (open) document.addEventListener('keydown', onEsc)
    return () => document.removeEventListener('keydown', onEsc)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onOpenChange(false)}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-hidden
      />
      <div
        className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl pb-[env(safe-area-inset-bottom)] animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Handle visuel (mobile) */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-black/10" />
        </div>
        {title && (
          <header className="px-6 py-3 border-b border-[var(--border)]">
            <h2 className="font-serif text-lg font-semibold text-[var(--justice)]">
              {title}
            </h2>
          </header>
        )}
        <div className="p-6 max-h-[85vh] overflow-y-auto">{children}</div>
      </div>
      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  )
}

export default PuramaSheet
