'use client'

import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  elevation?: 'flat' | 'subtle' | 'raised' | 'floating'
  /** Card with no glass background (transparent + border only) */
  outline?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      hover,
      padding = 'md',
      elevation = 'subtle',
      outline,
      children,
      ...props
    },
    ref
  ) => {
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-5 md:p-6',
      lg: 'p-6 md:p-8',
    }
    const elevations = {
      flat: '',
      subtle: 'elev-subtle',
      raised: 'elev-raised',
      floating: 'elev-floating',
    }
    return (
      <div
        ref={ref}
        className={cn(
          outline
            ? 'rounded-2xl border border-[var(--border)] bg-transparent'
            : 'rounded-2xl bg-[var(--bg-card)] backdrop-blur-xl',
          elevations[elevation],
          hover &&
            'transition-all duration-200 hover:bg-[var(--bg-card-hover)] hover:-translate-y-0.5 hover:elev-raised',
          paddings[padding],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
export default Card
