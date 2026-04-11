import type {
  CaseStatus,
  CaseType,
  JurisCase,
  JurisDocument,
  JurisMessage,
} from '@/types'

export const CASE_TYPE_LABELS: Record<CaseType, { label: string; icon: string; color: string }> = {
  amende: { label: 'Amendes & Infractions', icon: '🚗', color: 'blue' },
  travail: { label: 'Droit du travail', icon: '💼', color: 'amber' },
  logement: { label: 'Logement', icon: '🏠', color: 'green' },
  consommation: { label: 'Consommation', icon: '🛒', color: 'purple' },
  famille: { label: 'Famille', icon: '👨‍👩‍👧', color: 'gold' },
  administratif: { label: 'Administratif', icon: '📋', color: 'gray' },
  fiscal: { label: 'Fiscal', icon: '💶', color: 'amber' },
  penal: { label: 'Pénal', icon: '⚖️', color: 'red' },
  sante: { label: 'Santé', icon: '🏥', color: 'green' },
  assurance: { label: 'Assurances', icon: '🛡️', color: 'blue' },
  numerique: { label: 'Numérique / RGPD', icon: '💻', color: 'purple' },
  affaires: { label: 'Affaires', icon: '🏢', color: 'justice' },
}

export const CASE_STATUS_LABELS: Record<
  CaseStatus,
  { label: string; variant: 'gray' | 'amber' | 'blue' | 'gold' | 'purple' | 'green' }
> = {
  diagnostic: { label: 'Diagnostic', variant: 'gray' },
  analyse: { label: 'Analyse', variant: 'blue' },
  document_pret: { label: 'Document prêt', variant: 'amber' },
  signe: { label: 'Signé', variant: 'gold' },
  envoye: { label: 'Envoyé', variant: 'purple' },
  en_attente: { label: 'En attente', variant: 'blue' },
  resolu: { label: 'Résolu', variant: 'green' },
}

export const CASE_PHASES: CaseStatus[] = [
  'diagnostic',
  'analyse',
  'document_pret',
  'signe',
  'envoye',
  'resolu',
]

export function formatRelativeDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.round(diffMs / 1000)
  const diffMin = Math.round(diffSec / 60)
  const diffHour = Math.round(diffMin / 60)
  const diffDay = Math.round(diffHour / 24)

  if (diffSec < 60) return "à l'instant"
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHour < 24) return `il y a ${diffHour} h`
  if (diffDay < 7) return `il y a ${diffDay} j`
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }).format(d)
}

export function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDeadline(dateStr: string): string {
  const days = daysUntil(dateStr)
  if (days < 0) return `Expiré (${Math.abs(days)} j)`
  if (days === 0) return "Aujourd'hui"
  if (days === 1) return 'Demain'
  if (days <= 7) return `J-${days}`
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateStr))
}

export function formatEuros(value: number | null | undefined): string {
  if (value == null) return '0 €'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

// ============================================================
// Timeline building — visual events for /dossiers/[id]
// ============================================================

export type TimelineVariant =
  | 'case_created'
  | 'document_generated'
  | 'document_signed'
  | 'document_sent_email'
  | 'document_sent_recommande'
  | 'ar_received'
  | 'deadline_upcoming'
  | 'deadline_passed'
  | 'message'
  | 'status_change'

export interface TimelineEvent {
  id: string
  at: string // ISO date
  variant: TimelineVariant
  icon: string
  color: 'justice' | 'gold' | 'green' | 'amber' | 'red' | 'purple' | 'gray'
  label: string
  description?: string
  link?: string
}

export function buildTimeline(
  caseRow: JurisCase,
  messages: JurisMessage[],
  documents: JurisDocument[]
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Case opened
  events.push({
    id: `case-${caseRow.id}`,
    at: caseRow.created_at,
    variant: 'case_created',
    icon: '📁',
    color: 'gold',
    label: 'Dossier ouvert',
    description: caseRow.summary ?? undefined,
  })

  // Documents lifecycle
  for (const d of documents) {
    events.push({
      id: `doc-created-${d.id}`,
      at: d.created_at,
      variant: 'document_generated',
      icon: '📄',
      color: 'justice',
      label: 'Document généré',
      description: d.title,
      link: `/documents/${d.id}`,
    })
    if (d.signature_status === 'signed') {
      events.push({
        id: `doc-signed-${d.id}`,
        at: d.sent_at ?? d.created_at,
        variant: 'document_signed',
        icon: '✍️',
        color: 'gold',
        label: 'Document signé',
        description: d.title,
        link: `/documents/${d.id}`,
      })
    }
    if (d.sent_status === 'sent_email' && d.sent_at) {
      events.push({
        id: `doc-sent-${d.id}`,
        at: d.sent_at,
        variant: 'document_sent_email',
        icon: '📧',
        color: 'green',
        label: 'Envoyé par email',
        description: d.sent_to ? `À ${d.sent_to}` : d.title,
        link: `/documents/${d.id}`,
      })
    }
    if (d.sent_status === 'sent_recommande' && d.sent_at) {
      events.push({
        id: `doc-reco-${d.id}`,
        at: d.sent_at,
        variant: 'document_sent_recommande',
        icon: '📮',
        color: 'purple',
        label: 'Recommandé AR déposé',
        description:
          d.tracking_number != null
            ? `Suivi ${d.tracking_number}${d.sent_to ? ` — ${d.sent_to}` : ''}`
            : d.title,
        link: `/documents/${d.id}`,
      })
    }
    if (d.ar_received_at) {
      events.push({
        id: `doc-ar-${d.id}`,
        at: d.ar_received_at,
        variant: 'ar_received',
        icon: '📬',
        color: 'green',
        label: 'Accusé de réception reçu',
        description: d.sent_to ? `Remis à ${d.sent_to}` : d.title,
        link: `/documents/${d.id}`,
      })
    }
  }

  // Deadlines (convert to events — upcoming/past)
  for (const dl of caseRow.deadlines ?? []) {
    const days = daysUntil(dl.date)
    const passed = days < 0
    events.push({
      id: `deadline-${dl.date}-${dl.description.slice(0, 16)}`,
      at: dl.date,
      variant: passed ? 'deadline_passed' : 'deadline_upcoming',
      icon: passed ? '⛔' : '⏰',
      color: passed ? 'red' : dl.critical || days <= 3 ? 'amber' : 'justice',
      label: passed
        ? `Délai expiré (${Math.abs(days)} j)`
        : days === 0
          ? "Échéance aujourd'hui"
          : `Échéance ${formatDeadline(dl.date)}`,
      description: dl.description,
    })
  }

  // Assistant milestone messages (phase changes) — only those with distinctive markers
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    const text = m.content
    if (
      text.startsWith('📄') ||
      text.startsWith('✍️') ||
      text.startsWith('📧') ||
      text.startsWith('📮') ||
      text.startsWith('📬')
    ) {
      // Already covered by document lifecycle events
      continue
    }
    const stripped = text.replace(/[#*`>_]/g, '').slice(0, 160)
    events.push({
      id: `msg-${m.id}`,
      at: m.created_at,
      variant: 'message',
      icon: '⚖️',
      color: 'gray',
      label: 'Analyse JurisIA',
      description: stripped + (text.length > 160 ? '…' : ''),
    })
  }

  events.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  )
  return events
}

export const TIMELINE_COLOR_STYLES: Record<
  TimelineEvent['color'],
  { dot: string; text: string }
> = {
  justice: { dot: 'bg-[var(--justice)]', text: 'text-[var(--justice)]' },
  gold: { dot: 'bg-[var(--gold)]', text: 'text-[var(--gold-dark)]' },
  green: { dot: 'bg-emerald-500', text: 'text-emerald-700' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-700' },
  red: { dot: 'bg-red-600', text: 'text-red-700' },
  purple: { dot: 'bg-violet-500', text: 'text-violet-700' },
  gray: { dot: 'bg-slate-400', text: 'text-slate-600' },
}
