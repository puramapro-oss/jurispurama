import type { ReactNode } from 'react'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick?: () => void; href?: string }
}

/**
 * PuramaEmpty — empty state (V7.1 §12)
 * Layout centré avec icône circulaire + CTA.
 */
export function PuramaEmpty({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {icon && (
        <div className="h-16 w-16 rounded-full bg-[var(--justice)]/5 flex items-center justify-center mb-4 text-3xl">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg font-semibold text-[var(--justice)] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-5">
          {description}
        </p>
      )}
      {action && action.href && (
        <a
          href={action.href}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--justice)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--justice-dark)] transition-colors"
        >
          {action.label}
        </a>
      )}
      {action && !action.href && action.onClick && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--justice)] text-white px-5 py-2.5 text-sm font-medium hover:bg-[var(--justice-dark)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default PuramaEmpty
