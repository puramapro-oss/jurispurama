import type { CaseStatus, CaseType } from '@/types'

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
