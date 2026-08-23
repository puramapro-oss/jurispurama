import { createServiceClient } from '@/lib/supabase'
import type { CaseStatus, CaseType } from '@/types'
import type { JurisMeta } from '@/lib/prompts/jurisia'
import { VALID_CASE_TYPES, VALID_STATUSES } from './chat-constants'

type ServiceClient = ReturnType<typeof createServiceClient>

export async function applyMetaToCase(
  admin: ServiceClient,
  caseId: string,
  meta: JurisMeta
) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (meta.case_type && VALID_CASE_TYPES.includes(meta.case_type as CaseType)) {
    patch.type = meta.case_type
  }
  if (meta.sub_type) patch.sub_type = meta.sub_type
  if (meta.phase && VALID_STATUSES.includes(meta.phase as CaseStatus)) {
    patch.status = meta.phase
  }
  if (
    meta.success_probability != null &&
    meta.success_probability >= 0 &&
    meta.success_probability <= 100
  ) {
    patch.success_probability = Math.round(meta.success_probability)
  }
  if (meta.strategy) {
    patch.strategy = {
      recommended: meta.strategy.recommended ?? null,
      alternatives: meta.strategy.alternatives ?? [],
      legal_basis: meta.strategy.legal_basis ?? [],
      next_actions: meta.next_actions ?? [],
    }
  }
  if (Array.isArray(meta.deadlines)) {
    patch.deadlines = meta.deadlines.map((d) => ({
      date: d.date,
      description: d.description,
      critical: !!d.critical,
      notified: !!d.notified,
    }))
  }
  if (meta.estimated_savings != null && meta.estimated_savings >= 0) {
    patch.money_saved = meta.estimated_savings
  }

  await admin.from('jurispurama_cases').update(patch).eq('id', caseId)
}
