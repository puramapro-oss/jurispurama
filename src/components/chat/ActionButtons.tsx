'use client'

import { cn } from '@/lib/utils'
import {
  FileText,
  PenTool,
  Mail,
  Send,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react'

export type NextAction =
  | 'generate_document'
  | 'sign'
  | 'send_email'
  | 'send_recommande'
  | 'wait'
  | 'close'
  | 'ask_more'

interface ActionButtonsProps {
  actions: string[] | null | undefined
  onAction: (action: NextAction) => void
  className?: string
  disabled?: boolean
}

const ACTION_META: Record<
  NextAction,
  {
    label: string
    Icon: LucideIcon | null
    show: boolean
    variant: 'primary' | 'gold' | 'outline'
  }
> = {
  generate_document: {
    label: 'Générer ce document',
    Icon: FileText,
    show: true,
    variant: 'primary',
  },
  sign: {
    label: 'Signer électroniquement',
    Icon: PenTool,
    show: true,
    variant: 'gold',
  },
  send_email: {
    label: 'Envoyer par email',
    Icon: Mail,
    show: true,
    variant: 'outline',
  },
  send_recommande: {
    label: 'Recommandé AR',
    Icon: Send,
    show: true,
    variant: 'gold',
  },
  wait: { label: '', Icon: null, show: false, variant: 'outline' },
  close: {
    label: 'Clôturer le dossier',
    Icon: CheckCircle2,
    show: true,
    variant: 'outline',
  },
  ask_more: { label: '', Icon: null, show: false, variant: 'outline' },
}

const VARIANT_CLASSES = {
  primary:
    'border-[var(--justice)]/40 bg-[var(--justice)] text-white hover:bg-[var(--justice-light)] hover:border-[var(--justice-light)]',
  gold: 'border-[var(--gold)]/50 bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-[var(--justice-dark)] hover:brightness-105 font-semibold',
  outline:
    'border-[var(--justice)]/25 bg-white/70 text-[var(--justice)] hover:border-[var(--justice)]/50 hover:bg-white',
}

export default function ActionButtons({
  actions,
  onAction,
  className,
  disabled,
}: ActionButtonsProps) {
  if (!actions || actions.length === 0) return null
  const visible = actions
    .filter((a): a is NextAction => a in ACTION_META)
    .filter((a) => ACTION_META[a].show)

  if (visible.length === 0) return null

  return (
    <div className={cn('mt-3 flex flex-wrap gap-2', className)}>
      {visible.map((action) => {
        const meta = ACTION_META[action]
        const Icon = meta.Icon
        return (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action)}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 focus-ring disabled:opacity-50 disabled:cursor-not-allowed',
              VARIANT_CLASSES[meta.variant]
            )}
          >
            {Icon && (
              <Icon size={13} strokeWidth={2.2} aria-hidden="true" />
            )}
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}
