import type { Step } from '@/types/financer'
import { STEP_LABELS } from '@/lib/financer-constants'

interface FinancerStepperProps {
  step: Step
}

export default function FinancerStepper({ step }: FinancerStepperProps) {
  return (
    <div className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const s = (i + 1) as Step
        const active = step === s
        const done = step > s
        return (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                active
                  ? 'bg-[var(--justice)] text-white'
                  : done
                    ? 'bg-[var(--gold)] text-[var(--justice-dark)]'
                    : 'bg-white/60 text-[var(--text-muted)] border border-[var(--border)]'
              }`}
            >
              {done ? '✓' : s}
            </div>
            <span
              className={`hidden text-xs font-medium sm:block ${
                active
                  ? 'text-[var(--justice)]'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {label}
            </span>
            {i < 3 && (
              <div
                className={`mx-1 h-px flex-1 ${
                  done ? 'bg-[var(--gold)]' : 'bg-[var(--border)]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
