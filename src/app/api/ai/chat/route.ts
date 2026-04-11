import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { streamClaude, type ChatMessage, type ImageAttachment } from '@/lib/claude'
import {
  buildUserContext,
  composeSystemPrompt,
  extractJurisMeta,
  type JurisMeta,
} from '@/lib/prompts/jurisia'
import type { CaseStatus, CaseType } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  caseId: z.string().uuid().optional(),
  message: z.string().min(1).max(8000),
  attachments: z
    .array(
      z.object({
        url: z.string().optional(),
        data: z.string().optional(),
        media_type: z
          .enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
          .optional(),
        type: z.string().optional(),
        name: z.string().optional(),
      })
    )
    .optional(),
})

const FREE_MONTHLY_LIMIT = 3

const VALID_CASE_TYPES: CaseType[] = [
  'amende',
  'travail',
  'logement',
  'consommation',
  'famille',
  'administratif',
  'fiscal',
  'penal',
  'sante',
  'assurance',
  'numerique',
  'affaires',
]

const VALID_STATUSES: CaseStatus[] = [
  'diagnostic',
  'analyse',
  'document_pret',
  'signe',
  'envoye',
  'en_attente',
  'resolu',
]

function sseEncode(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  // 1) Auth
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return errorResponse('Non authentifié. Connecte-toi pour discuter avec JurisIA.', 401)
  }

  // 2) Parse + validate
  let body: z.infer<typeof bodySchema>
  try {
    const json = await req.json()
    body = bodySchema.parse(json)
  } catch {
    return errorResponse('Requête invalide. Le message est requis.', 400)
  }

  // 3) Load profile
  const { data: profile } = await supabase
    .from('jurispurama_users')
    .select('id, email, full_name, phone, subscription_plan, role')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!profile) {
    return errorResponse(
      'Ton profil JurisPurama est introuvable. Rafraîchis la page et reconnecte-toi.',
      404
    )
  }

  // 4) Quota free
  if (profile.subscription_plan === 'free') {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('jurispurama_cases')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .gte('created_at', startOfMonth.toISOString())

    if (!body.caseId && (count ?? 0) >= FREE_MONTHLY_LIMIT) {
      return errorResponse(
        `Limite atteinte : le plan Gratuit est plafonné à ${FREE_MONTHLY_LIMIT} dossiers par mois. Passe à Essentiel pour créer des dossiers illimités.`,
        402
      )
    }
  }

  // 5) Legal profile (pour pré-remplissage)
  const { data: legalProfile } = await supabase
    .from('jurispurama_legal_profiles')
    .select('*')
    .eq('user_id', profile.id)
    .maybeSingle()

  // 6) Load or create case
  let caseId = body.caseId ?? null
  let caseJustCreated = false

  if (caseId) {
    const { data: existing } = await supabase
      .from('jurispurama_cases')
      .select('id, user_id')
      .eq('id', caseId)
      .eq('user_id', profile.id)
      .maybeSingle()
    if (!existing) {
      return errorResponse('Ce dossier est introuvable ou ne t’appartient pas.', 404)
    }
  } else {
    const summary =
      body.message.length > 140
        ? `${body.message.slice(0, 137)}...`
        : body.message
    const { data: created, error: createErr } = await supabase
      .from('jurispurama_cases')
      .insert({
        user_id: profile.id,
        type: 'administratif',
        status: 'diagnostic' as CaseStatus,
        summary,
        money_saved: 0,
      })
      .select('id')
      .maybeSingle()
    if (createErr || !created) {
      return errorResponse(
        'Impossible de créer le dossier. Réessaie dans un instant.',
        500
      )
    }
    caseId = created.id
    caseJustCreated = true
  }

  // 7) Persist user message
  const userAttachments = (body.attachments ?? []).map((a) => ({
    url: a.url ?? '',
    type: a.media_type ?? a.type ?? 'unknown',
    name: a.name ?? 'fichier',
  }))

  const { error: userMsgErr } = await supabase
    .from('jurispurama_messages')
    .insert({
      case_id: caseId,
      role: 'user',
      content: body.message,
      attachments: userAttachments.length > 0 ? userAttachments : null,
    })

  if (userMsgErr) {
    return errorResponse(
      'Impossible d’enregistrer ton message. Réessaie.',
      500
    )
  }

  // 8) Load history (last 20 messages)
  const { data: history } = await supabase
    .from('jurispurama_messages')
    .select('role, content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })
    .limit(40)

  // Convert to Claude format. Include attachment images on the LAST user msg.
  const images: ImageAttachment[] = []
  for (const a of body.attachments ?? []) {
    if (a.data && a.media_type) {
      images.push({ media_type: a.media_type, data: a.data })
    }
  }

  const claudeMessages: ChatMessage[] = (history ?? [])
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // If the latest user message was just persisted, attach images to it
  if (images.length > 0 && claudeMessages.length > 0) {
    const last = claudeMessages[claudeMessages.length - 1]
    if (last.role === 'user') {
      last.images = images
    }
  }

  const userContext = buildUserContext(
    {
      full_name: profile.full_name ?? null,
      email: profile.email ?? null,
      phone: null,
    },
    legalProfile ?? null
  )
  const system = composeSystemPrompt(userContext)

  // 9) Stream SSE
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = ''
      try {
        if (caseJustCreated && caseId) {
          controller.enqueue(
            encoder.encode(
              sseEncode({ type: 'case_created', caseId })
            )
          )
        }

        let metaBuffering = false
        let emittedCount = 0

        for await (const chunk of streamClaude({
          messages: claudeMessages,
          system,
          max_tokens: 4096,
        })) {
          fullText += chunk

          // Detect meta block start; stop streaming to client once we enter it.
          if (!metaBuffering) {
            const metaIdx = fullText.indexOf('<juris-meta>')
            if (metaIdx !== -1) {
              metaBuffering = true
              const toEmit = fullText.slice(emittedCount, metaIdx)
              if (toEmit.length > 0) {
                controller.enqueue(
                  encoder.encode(sseEncode({ type: 'text', content: toEmit }))
                )
                emittedCount = metaIdx
              }
            } else {
              // Emit safely — keep a small tail buffer in case <juris-meta> is split across chunks
              const safeEnd = Math.max(
                0,
                fullText.length - '<juris-meta>'.length
              )
              if (safeEnd > emittedCount) {
                const toEmit = fullText.slice(emittedCount, safeEnd)
                controller.enqueue(
                  encoder.encode(sseEncode({ type: 'text', content: toEmit }))
                )
                emittedCount = safeEnd
              }
            }
          }
        }

        // If we never hit the meta tag, flush the remaining tail
        if (!metaBuffering && emittedCount < fullText.length) {
          const toEmit = fullText.slice(emittedCount)
          if (toEmit.length > 0) {
            controller.enqueue(
              encoder.encode(sseEncode({ type: 'text', content: toEmit }))
            )
          }
        }

        const { meta, cleaned } = extractJurisMeta(fullText)

        // Persist assistant message (without meta block)
        const admin = createServiceClient()
        await admin
          .from('jurispurama_messages')
          .insert({
            case_id: caseId,
            role: 'assistant',
            content: cleaned,
            attachments: null,
          })

        if (meta && caseId) {
          await applyMetaToCase(admin, caseId, meta)
        }

        controller.enqueue(
          encoder.encode(
            sseEncode({
              type: 'done',
              caseId,
              meta: meta ?? null,
            })
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Une erreur technique est survenue.'
        controller.enqueue(
          encoder.encode(
            sseEncode({
              type: 'error',
              error: `JurisIA rencontre un souci : ${msg}. Réessaie dans un instant.`,
            })
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

type ServiceClient = ReturnType<typeof createServiceClient>

async function applyMetaToCase(
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
