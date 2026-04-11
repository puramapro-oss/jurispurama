import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export default function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gradient-to-r from-[var(--justice)]/5 via-[var(--justice)]/10 to-[var(--justice)]/5',
        className
      )}
      aria-hidden="true"
    />
  )
}
