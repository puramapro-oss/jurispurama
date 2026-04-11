import { cn } from '@/lib/utils'

interface ProgressProps {
  value: number // 0-100
  className?: string
  barClassName?: string
  label?: string
  showLabel?: boolean
}

export default function Progress({
  value,
  className,
  barClassName,
  label,
  showLabel,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('w-full', className)}>
      {(label || showLabel) && (
        <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>{label}</span>
          {showLabel && <span className="font-semibold">{clamped}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--justice)]/10">
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r from-[var(--justice)] via-[var(--justice-light)] to-[var(--gold)] transition-all duration-500',
            barClassName
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
