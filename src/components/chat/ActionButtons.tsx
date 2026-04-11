'use client'

import { cn } from '@/lib/utils'

export type NextAction =
  | 'generate_document'
  | 'sign'
  | 'send_email'
  | 'send_recommande'
  | 'book_appointment'
  | 'wait'
  | 'close'
  | 'ask_more'

interface ActionButtonsProps {
  actions: string[] | null | undefined
  onAction: (action: NextAction) => void
  className?: string
}

const ACTION_META: Record<
  NextAction,
  { label: string; icon: string; show: boolean }
> = {
  generate_document: { label: 'Générer ce document', icon: '📄', show: true },
  sign: { label: 'Signer électroniquement', icon: '✍️', show: true },
  send_email: { label: 'Envoyer par email', icon: '📧', show: true },
  send_recommande: { label: 'Envoyer en recommandé AR', icon: '📨', show: true },
  book_appointment: { label: 'Prendre rendez-vous', icon: '📅', show: true },
  wait: { label: 'Attendre la réponse', icon: '⏳', show: false },
  close: { label: 'Clôturer le dossier', icon: '✅', show: true },
  ask_more: { label: '', icon: '', show: false },
}

export default function ActionButtons({
  actions,
  onAction,
  className,
}: ActionButtonsProps) {
  if (!actions || actions.length === 0) return null
  const visible = actions
    .filter((a): a is NextAction => a in ACTION_META)
    .filter((a) => ACTION_META[a].show)

  if (visible.length === 0) return null

  return (
    <div
      className={cn(
        'mt-2 flex flex-wrap gap-2',
        className
      )}
    >
      {visible.map((action) => {
        const meta = ACTION_META[action]
        return (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--gold-dark)] transition-all hover:border-[var(--gold)] hover:bg-[var(--gold)]/20 active:scale-95"
          >
            <span aria-hidden="true">{meta.icon}</span>
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
