import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createRequestSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { streamClaude, type ChatMessage, type ImageAttachment } from '@/lib/claude'
import {
  buildUserContext,
  composeSystemPrompt,
  extractJurisMeta,
} from '@/lib/prompts/jurisia'
import type { CaseStatus } from '@/types'
import {
  bodySchema,
  CHAT_RESPONSE_DEADLINE_MS,
  ChatPersistenceError,
  FREE_MONTHLY_LIMIT,
  publicChatText,
} from '@/lib/ai/chat-constants'
import { applyMetaToCase } from '@/lib/ai/apply-meta-to-case'
import { createChatStreamControl } from '@/lib/ai/chat-stream-control'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'
const caseIdSchema = z.string().uuid()

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export async function POST(req: NextRequest) {
  const startedAt = performance.now()
  if (req.signal.aborted) return new Response(null, { status: 499 })
  // 1) Auth
  const requestClient = await createRequestSupabaseClient(req)
  if (!requestClient) {
    return errorResponse('Non authentifié. Connecte-toi pour discuter avec JurisIA.', 401)
  }
  const { client: supabase, accessToken } = requestClient
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken)
  if (authError || !user) {
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

  if (req.signal.aborted) return new Response(null, { status: 499 })

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
    const createdId = caseIdSchema.safeParse(created?.id)
    if (createErr || !createdId.success) {
      return errorResponse(
        'Impossible de créer le dossier. Réessaie dans un instant.',
        500
      )
    }
    caseId = createdId.data
    caseJustCreated = true
  }

  // 7) Snapshot the latest prior turns before this request is inserted. Ordering
  // by ID as well makes ties deterministic; a concurrent request cannot displace
  // this request or receive its attachments in the model context below.
  if (req.signal.aborted) return new Response(null, { status: 499 })
  const { data: history, error: historyError } = caseJustCreated
    ? { data: [], error: null }
    : await supabase
      .from('jurispurama_messages')
      .select('id, role, content, created_at')
      .eq('case_id', caseId)
      .in('role', ['user', 'assistant'])
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(39)
      .abortSignal(req.signal)

  if (req.signal.aborted) return new Response(null, { status: 499 })
  if (historyError || !Array.isArray(history)) {
    return errorResponse('Impossible de charger l’historique du dossier. Réessaie dans un instant.', 503)
  }

  // 8) Persist the current request and require its database receipt before AI work.
  const userAttachments = (body.attachments ?? []).map((a: { url?: string; data?: string; media_type?: string; type?: string; name?: string }) => ({
    url: a.url ?? '',
    type: a.media_type ?? a.type ?? 'unknown',
    name: a.name ?? 'fichier',
  }))

  const { data: savedUserMessage, error: userMsgErr } = await supabase
    .from('jurispurama_messages')
    .insert({
      case_id: caseId,
      role: 'user',
      content: body.message,
      attachments: userAttachments.length > 0 ? userAttachments : null,
    })
    .select('id')
    .abortSignal(req.signal)
    .maybeSingle()

  if (req.signal.aborted) return new Response(null, { status: 499 })
  if (userMsgErr || !savedUserMessage?.id) {
    // A missing receipt can hide a committed write: retain the dossier and let
    // the client reload it before an explicit retry instead of deleting it.
    return NextResponse.json({
      error: caseJustCreated
        ? 'Le dossier est créé, mais l’enregistrement du message n’a pas été confirmé. Recharge le dossier avant une nouvelle demande.'
        : 'Impossible d’enregistrer ton message. Réessaie.',
      ...(caseJustCreated ? { caseId } : {}),
    }, { status: 500 })
  }

  // Rebuild chronological context without changing stored history. The current
  // request is appended explicitly, with its own images, and the total stays <=40.
  const images: ImageAttachment[] = []
  for (const a of body.attachments ?? []) {
    if (a.data && a.media_type) {
      images.push({ media_type: a.media_type, data: a.data })
    }
  }

  const claudeMessages: ChatMessage[] = [...history]
    .reverse()
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

  // A bounded window can start midway through a turn. Drop orphan assistant
  // messages instead of inventing a user message or sending an invalid prefix.
  const firstUserIndex = claudeMessages.findIndex(message => message.role === 'user')
  claudeMessages.splice(0, firstUserIndex === -1 ? claudeMessages.length : firstUserIndex)

  claudeMessages.push({
    role: 'user',
    content: body.message,
    ...(images.length > 0 ? { images } : {}),
  })

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
  let control: ReturnType<typeof createChatStreamControl> | undefined
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const active = createChatStreamControl(controller, req.signal,
        CHAT_RESPONSE_DEADLINE_MS - (performance.now() - startedAt))
      control = active
      let fullText = ''
      try {
        active.signal.throwIfAborted()
        if (caseJustCreated && caseId) {
          active.send({ type: 'case_created', caseId })
        }

        let metaBuffering = false
        let emittedCount = 0

        for await (const chunk of streamClaude({
          messages: claudeMessages,
          system,
          max_tokens: 4096,
          signal: active.signal,
        })) {
          active.signal.throwIfAborted()
          fullText += chunk

          // Detect meta block start; stop streaming to client once we enter it.
          if (!metaBuffering) {
            const metaIdx = fullText.search(/<juris-meta>/i)
            if (metaIdx !== -1) {
              metaBuffering = true
              const toEmit = fullText.slice(emittedCount, metaIdx)
              if (toEmit.length > 0) {
                active.send({ type: 'text', content: toEmit })
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
                active.send({ type: 'text', content: toEmit })
                emittedCount = safeEnd
              }
            }
          }
        }

        active.signal.throwIfAborted()
        const visibleText = publicChatText(fullText)
        // Flush only public text; an incomplete metadata suffix remains private.
        if (!metaBuffering && emittedCount < visibleText.length) {
          const toEmit = visibleText.slice(emittedCount)
          if (toEmit.length > 0) {
            active.send({ type: 'text', content: toEmit })
          }
        }

        const { meta } = extractJurisMeta(fullText)
        const cleaned = visibleText.trim()
        if (!cleaned) throw new Error('Empty public model response')

        // Persist assistant message (without meta block)
        const admin = createServiceClient()
        const { data: savedAssistantMessage, error: assistantMessageError } = await admin
          .from('jurispurama_messages')
          .insert({
            case_id: caseId,
            role: 'assistant',
            content: cleaned,
            attachments: null,
          })
          .select('id')
          .abortSignal(active.signal)
          .maybeSingle()
        active.signal.throwIfAborted()
        if (assistantMessageError || !savedAssistantMessage?.id) {
          throw new ChatPersistenceError('assistant')
        }

        if (meta && caseId) {
          await applyMetaToCase(admin, caseId, meta, active.signal)
        }

        active.send({ type: 'done', caseId, meta: meta ?? null })
        active.finish()
      } catch (err) {
        const msg =
          err instanceof ChatPersistenceError
            ? err.message
            : 'Une erreur technique est survenue.'
        active.error(`JurisIA rencontre un souci : ${msg}. Réessaie dans un instant.`)
      } finally {
        active.dispose()
      }
    },
    cancel(reason) { control?.cancel(reason) },
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

