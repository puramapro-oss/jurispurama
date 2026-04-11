'use client'

import type { CaseStatus } from '@/types'
import { CASE_PHASES, CASE_STATUS_LABELS } from '@/lib/case-helpers'
import { cn } from '@/lib/utils'

interface PhaseStepperProps {
  current: CaseStatus
  className?: string
}

export default function PhaseStepper({ current, className }: PhaseStepperProps) {
  const currentIdx =
    current === 'en_attente'
      ? CASE_PHASES.indexOf('envoye')
      : CASE_PHASES.indexOf(current)
  const effectiveIdx = currentIdx === -1 ? 0 : currentIdx

  return (
    <nav
      aria-label="Étapes du dossier"
      className={cn(
        'flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-white/70 p-2 backdrop-blur',
        className
      )}
    >
      {CASE_PHASES.map((phase, idx) => {
        const label = CASE_STATUS_LABELS[phase].label
        const passed = idx < effectiveIdx
        const active = idx === effectiveIdx
        return (
          <div key={phase} className="flex items-center gap-1">
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors',
                active &&
                  'bg-gradient-to-r from-[var(--justice)] to-[var(--justice-light)] text-white shadow',
                passed && 'text-[var(--justice)]',
                !passed && !active && 'text-[var(--text-muted)]'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  active && 'bg-white/20 text-white',
                  passed && 'bg-[var(--gold)] text-[var(--justice-dark)]',
                  !passed && !active && 'bg-[var(--border)] text-[var(--text-muted)]'
                )}
                aria-hidden="true"
              >
                {passed ? '✓' : idx + 1}
              </span>
              {label}
            </div>
            {idx < CASE_PHASES.length - 1 && (
              <div
                aria-hidden="true"
                className={cn(
                  'h-0.5 w-3 shrink-0 rounded',
                  passed
                    ? 'bg-[var(--gold)]'
                    : 'bg-[var(--border)]'
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
