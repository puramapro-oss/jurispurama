'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading,
      icon,
      iconRight,
      children,
      disabled,
      fullWidth,
      ...props
    },
    ref
  ) => {
    const variants = {
      primary:
        'bg-[var(--justice)] text-white hover:bg-[var(--justice-light)] shadow-md shadow-[rgba(30,58,95,0.25)]',
      gold: 'bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-[var(--justice-dark)] hover:brightness-105 shadow-md shadow-[rgba(201,168,76,0.35)] font-semibold',
      secondary:
        'bg-white text-[var(--justice)] border border-[var(--border-strong)] hover:bg-[var(--bg-nebula)] hover:border-[var(--justice)]',
      outline:
        'bg-transparent text-[var(--justice)] border border-[var(--justice)]/40 hover:border-[var(--justice)] hover:bg-[var(--justice)]/5',
      ghost:
        'text-[var(--text-secondary)] hover:text-[var(--justice)] hover:bg-white/60',
      danger: 'bg-red-600 text-white hover:bg-red-700',
    }
    // Heights harmonisées : xs=32, sm=36, md=44 (touch target), lg=52
    const sizes = {
      xs: 'h-8 px-3 text-xs rounded-lg gap-1.5',
      sm: 'h-9 px-4 text-sm rounded-lg gap-1.5',
      md: 'h-11 px-5 text-sm rounded-xl gap-2',
      lg: 'h-13 px-7 text-[15px] rounded-xl gap-2 font-semibold',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] focus-ring',
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className
        )}
        style={size === 'lg' ? { height: 52 } : undefined}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
