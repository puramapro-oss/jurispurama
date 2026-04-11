'use client'

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder = 'Raconte ton problème juridique à JurisIA…',
  autoFocus,
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 260)}px`
  }, [value])

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus()
  }, [autoFocus])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (disabled || !value.trim()) return
    onSubmit()
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (disabled || !value.trim()) return
      onSubmit()
    }
  }

  const canSubmit = !disabled && value.trim().length > 0

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        'relative rounded-2xl border border-[var(--border)] bg-white/90 shadow-lg backdrop-blur-xl',
        'focus-within:border-[var(--justice)]/40 focus-within:shadow-xl focus-within:shadow-[var(--justice)]/5',
        'transition-all',
        className
      )}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        aria-label="Message à JurisIA"
        className="block w-full resize-none rounded-2xl bg-transparent px-4 py-3.5 pr-14 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={!canSubmit}
        aria-label="Envoyer à JurisIA"
        className={cn(
          'absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-xl transition-all',
          canSubmit
            ? 'bg-[var(--justice)] text-white hover:bg-[var(--justice-light)] active:scale-95 shadow-md shadow-[var(--justice)]/30'
            : 'bg-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'
        )}
      >
        {disabled ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              className="opacity-25"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-5 w-5"
          >
            <path
              d="M4 20L20 12L4 4L4 10L16 12L4 14L4 20Z"
              fill="currentColor"
            />
          </svg>
        )}
      </button>

      <div className="flex items-center justify-between px-4 pb-2 pt-0 text-[11px] text-[var(--text-muted)]">
        <span className="hidden sm:inline">
          Appuie sur <kbd className="rounded bg-[var(--justice)]/5 px-1.5 py-0.5 font-mono">Entrée</kbd> pour envoyer ·{' '}
          <kbd className="rounded bg-[var(--justice)]/5 px-1.5 py-0.5 font-mono">Maj + Entrée</kbd> pour nouvelle ligne
        </span>
        <span className="ml-auto">
          {value.length > 0 ? `${value.length} caractères` : ''}
        </span>
      </div>
    </form>
  )
}
