'use client'

import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  /** Mobile slides from bottom, desktop from right */
  side?: 'right' | 'bottom' | 'auto'
  /** Width on desktop. Ignored on mobile bottom sheet */
  width?: 'sm' | 'md' | 'lg'
  children: ReactNode
  footer?: ReactNode
}

export default function Sheet({
  open,
  onClose,
  title,
  description,
  side = 'auto',
  width = 'md',
  children,
  footer,
}: SheetProps) {
  // Esc key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = {
    sm: 'md:w-[380px]',
    md: 'md:w-[480px]',
    lg: 'md:w-[640px]',
  }

  // Mobile = bottom sheet ; desktop = right side
  const sideClasses =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl'
      : side === 'right'
        ? 'inset-y-0 right-0 h-full max-h-screen rounded-l-3xl'
        : // auto = bottom on mobile, right on desktop
          'inset-x-0 bottom-0 max-h-[90vh] rounded-t-3xl md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:h-full md:max-h-screen md:rounded-t-none md:rounded-l-3xl'

  return (
    <div
      className="fixed inset-0 z-[1000] flex"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-[var(--justice-dark)]/45 backdrop-blur-[2px] transition-opacity animate-[fadeIn_.18s_ease]"
      />

      {/* Panel */}
      <div
        className={cn(
          'absolute flex w-full flex-col bg-[var(--bg-void)] elev-modal animate-[slideUp_.25s_cubic-bezier(.32,.72,.16,1)]',
          sideClasses,
          side !== 'bottom' && widths[width]
        )}
      >
        {/* Drag handle (mobile bottom sheet) */}
        <div className="flex justify-center pt-2 md:hidden">
          <span className="h-1 w-10 rounded-full bg-[var(--border-strong)]" />
        </div>

        {/* Header */}
        {(title || description) && (
          <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4 md:px-6">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="font-serif text-xl font-semibold text-[var(--justice)] md:text-2xl">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="touch-target -mr-1 flex shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--justice)] focus-ring"
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </header>
        )}

        {/* Body */}
        <div className="scroll-smooth-y flex-1 px-5 py-5 md:px-6 md:py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <footer className="border-t border-[var(--border)] bg-white/60 px-5 py-4 backdrop-blur-md md:px-6">
            {footer}
          </footer>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
