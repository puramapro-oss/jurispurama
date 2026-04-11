'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  className?: string
}

export default function Tabs({ items, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-white/60 p-1',
        className
      )}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              active
                ? 'bg-[var(--justice)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-white hover:text-[var(--justice)]'
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--justice)]/10 text-[var(--justice)]'
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
