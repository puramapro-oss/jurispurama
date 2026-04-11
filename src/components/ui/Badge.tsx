import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'default'
  | 'justice'
  | 'gold'
  | 'green'
  | 'amber'
  | 'red'
  | 'blue'
  | 'purple'
  | 'gray'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

export default function Badge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-white/70 text-[var(--text-secondary)] border border-[var(--border)]',
    justice: 'bg-[var(--justice)]/10 text-[var(--justice)] border border-[var(--justice)]/20',
    gold: 'bg-[var(--gold)]/15 text-[var(--gold-dark)] border border-[var(--gold)]/30',
    green: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    red: 'bg-red-50 text-red-700 border border-red-200',
    blue: 'bg-blue-50 text-blue-700 border border-blue-200',
    purple: 'bg-violet-50 text-violet-700 border border-violet-200',
    gray: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
