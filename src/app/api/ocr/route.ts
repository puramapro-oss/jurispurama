import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { getAnthropic, DEFAULT_MODEL } from '@/lib/claude'
import { APP_SCHEMA } from '@/lib/constants'

export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

const BUCKET = 'jurispurama-documents'

interface OcrResult {
  document_type: string
  summary: string
  extracted_text: string
  extracted_fields: Record<string, string | number | null>
  insights: Array<{
    severity: 'info' | 'warning' | 'critical'
    message: string
    legal_basis?: string
  }>
  recommended_actions: Array<{
    action:
      | 'generate_document'
      | 'contest'
      | 'request_refund'
      | 'send_recommande'
      | 'ask_more'
      | 'close'
    label: string
  }>
  deadlines: Array<{ date: string; description: string; critical: boolean }>
}

const OCR_SYSTEM_PROMPT = `Tu es un OCR juridique expert français. Tu analyses des documents scannés (PV, amendes, contrats, courriers administratifs, factures, avis d'imposition, mises en demeure, etc.) et tu extrais TOUTES les informations pertinentes.

Tu dois retourner UNIQUEMENT un JSON valide (aucun texte hors JSON) respectant EXACTEMENT ce schéma :

{
  "document_type": "string — type détecté (ex: 'pv_amende_routiere', 'contrat_travail', 'bail_habitation', 'lettre_recouvrement', 'avis_imposition', 'facture', 'courrier_administratif', 'autre')",
  "summary": "string — résumé du document en 2-3 phrases",
  "extracted_text": "string — texte complet extrait, lisible, ponctué",
  "extracted_fields": {
    "key": "value"
  },
  "insights": [
    {
      "severity": "info | warning | critical",
      "message": "string — observation juridique (ex: 'Vice de forme détecté : absence de mention du radar')",
      "legal_basis": "string optionnel — article de loi (ex: 'Art. 429 CPP')"
    }
  ],
  "recommended_actions": [
    { "action": "generate_document | contest | request_refund | send_recommande | ask_more | close", "label": "Libellé court français" }
  ],
  "deadlines": [
    { "date": "YYYY-MM-DD", "description": "string", "critical": true }
  ]
}

RÈGLES :
- Les clés de extracted_fields doivent être snake_case FR (ex: "numero_pv", "date_infraction", "lieu", "vitesse_mesuree", "vitesse_retenue", "montant", "nom", "prenom", "adresse", "reference", "expediteur", "destinataire", "date_edition", "date_limite_paiement", "article_vise").
- insights : identifie les VICES DE FORME, irrégularités, failles légales exploitables, ou simplement l'analyse du document si rien de notable.
- Pour une amende routière : vérifie mention agent, lieu précis, vitesse retenue, marge d'erreur, numéro, date. Si manquant → insight warning/critical.
- Pour un contrat de travail : vérifie mentions obligatoires (Art. L1221-1 et suivants), clauses abusives.
- Pour un bail : vérifie mentions loi 6/7/1989 Art. 3.
- Pour une facture / mise en demeure : vérifie mentions légales, TVA, délais.
- Pour un avis administratif : identifie le délai de recours (Art. R.421-1 CJA = 2 mois) et calcule la date limite depuis la date de notification si lisible.
- deadlines : date format YYYY-MM-DD, critical=true si < 15 jours calendaires depuis aujourd'hui.
- Si un champ est illisible, mets sa valeur à null.
- Si le document est flou/illisible, retourne document_type="autre" avec summary expliquant le problème.

Tu ne dois JAMAIS inventer une information absente. Tu cites TOUJOURS les articles de loi exacts.`

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Connecte-toi pour utiliser le scanner.' },
      { status: 401 }
    )
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id, subscription_plan, role, email')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (!juriUser) {
    return NextResponse.json(
      { error: 'Profil JurisPurama introuvable.' },
      { status: 404 }
    )
  }

  // Parse multipart
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json(
      { error: 'Requête invalide — fichier manquant.' },
      { status: 400 }
    )
  }

  const file = form.get('file')
  const caseIdRaw = form.get('caseId')
  const contextRaw = form.get('context')
  const caseId =
    typeof caseIdRaw === 'string' && caseIdRaw.length > 0 ? caseIdRaw : null
  const context =
    typeof contextRaw === 'string' && contextRaw.length > 0 ? contextRaw : null

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Aucun fichier reçu. Joins une image ou un PDF.' },
      { status: 400 }
    )
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: 'Fichier vide.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        error: `Fichier trop volumineux (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo.`,
      },
      { status: 413 }
    )
  }

  const mime = file.type || 'application/octet-stream'
  if (!ALLOWED_MIMES.has(mime)) {
    return NextResponse.json(
      {
        error:
          'Format non supporté. Utilise JPEG, PNG, WEBP, GIF ou PDF (max 10 Mo).',
      },
      { status: 415 }
    )
  }

  // Read bytes
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')

  // Upload to storage with service client (bypass RLS using user-scoped path)
  const admin = createServiceClient()
  const authUserId = user.id
  const timestamp = Date.now()
  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 80) || 'document'
  const storagePath = `${authUserId}/${caseId ?? 'scans'}/${timestamp}-${safeName}`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: mime,
      upsert: false,
    })

  if (uploadErr) {
    return NextResponse.json(
      {
        error: `Impossible d'enregistrer le fichier : ${uploadErr.message}`,
      },
      { status: 500 }
    )
  }

  // Signed URL for preview (1h)
  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600)
  const signedUrl = signed?.signedUrl ?? ''

  // Call Claude Vision
  const client = getAnthropic()
  const userPrompt = context
    ? `Analyse ce document. Contexte fourni par l'utilisateur : "${context}". Retourne UNIQUEMENT le JSON demandé.`
    : `Analyse ce document juridique. Retourne UNIQUEMENT le JSON demandé.`

  type ContentBlock =
    | {
        type: 'image'
        source: {
          type: 'base64'
          media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
          data: string
        }
      }
    | {
        type: 'document'
        source: { type: 'base64'; media_type: 'application/pdf'; data: string }
      }
    | { type: 'text'; text: string }

  const contentBlocks: ContentBlock[] = []

  if (mime === 'application/pdf') {
    contentBlocks.push({
      type: 'document',
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64,
      },
    })
  } else {
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mime as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: base64,
      },
    })
  }
  contentBlocks.push({ type: 'text', text: userPrompt })

  let result: OcrResult
  try {
    const resp = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 8192,
      temperature: 0.1,
      system: OCR_SYSTEM_PROMPT,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: 'user', content: contentBlocks as any }],
    })
    const raw = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Strip possible markdown code fences
    const jsonStr = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()

    result = JSON.parse(jsonStr) as OcrResult
  } catch (err) {
    // Cleanup upload on failure
    await admin.storage.from(BUCKET).remove([storagePath])
    const msg = err instanceof Error ? err.message : 'erreur inconnue'
    return NextResponse.json(
      {
        error: `JurisIA n'a pas pu analyser ce document (${msg}). Réessaie avec une photo plus nette ou un PDF mieux cadré.`,
      },
      { status: 502 }
    )
  }

  // Save scan row
  const { data: scanRow } = await admin
    .from('jurispurama_scans')
    .insert({
      user_id: juriUser.id,
      case_id: caseId,
      file_name: file.name,
      file_path: storagePath,
      mime_type: mime,
      detected_type: result.document_type,
      extracted_text: result.extracted_text,
      extracted_fields: result.extracted_fields,
      insights: result.insights,
      recommended_actions: result.recommended_actions,
    })
    .select('id')
    .maybeSingle()

  // If caseId provided, inject a summary message into the conversation
  if (caseId) {
    const { data: caseCheck } = await admin
      .from('jurispurama_cases')
      .select('id, user_id')
      .eq('id', caseId)
      .maybeSingle()

    if (caseCheck && caseCheck.user_id === juriUser.id) {
      const insightsSummary =
        result.insights.length > 0
          ? result.insights
              .map(
                (i) =>
                  `- **${i.severity.toUpperCase()}** : ${i.message}${i.legal_basis ? ` (${i.legal_basis})` : ''}`
              )
              .join('\n')
          : '_Aucun point d\'attention majeur détecté._'

      const fieldsSummary = Object.entries(result.extracted_fields)
        .slice(0, 12)
        .map(([k, v]) => `- **${k.replace(/_/g, ' ')}** : ${v ?? '—'}`)
        .join('\n')

      const content = `📄 **Document scanné : ${result.document_type.replace(/_/g, ' ')}**

${result.summary}

**Champs extraits**
${fieldsSummary || '_(aucun)_'}

**Analyse juridique**
${insightsSummary}

_Tu peux me poser toute question sur ce document ou cliquer sur "Générer un document" pour rédiger la réponse adaptée._`

      await admin.from('jurispurama_messages').insert({
        case_id: caseId,
        role: 'assistant',
        content,
        attachments: [
          {
            url: signedUrl,
            type: mime,
            name: file.name,
            scan_id: scanRow?.id ?? null,
          },
        ],
      })

      // If deadlines detected, merge into case
      if (Array.isArray(result.deadlines) && result.deadlines.length > 0) {
        const { data: existing } = await admin
          .from('jurispurama_cases')
          .select('deadlines')
          .eq('id', caseId)
          .maybeSingle()
        const prev = (existing?.deadlines as typeof result.deadlines) ?? []
        const merged = [
          ...prev,
          ...result.deadlines.map((d) => ({ ...d, notified: false })),
        ]
        await admin
          .from('jurispurama_cases')
          .update({ deadlines: merged, updated_at: new Date().toISOString() })
          .eq('id', caseId)
      }
    }
  }

  return NextResponse.json({
    scan_id: scanRow?.id ?? null,
    signed_url: signedUrl,
    storage_path: storagePath,
    document_type: result.document_type,
    summary: result.summary,
    extracted_text: result.extracted_text,
    extracted_fields: result.extracted_fields,
    insights: result.insights,
    recommended_actions: result.recommended_actions,
    deadlines: result.deadlines ?? [],
  })
}

// GET — list recent scans (last 10 for history page)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })
  }

  const { data: juriUser } = await supabase
    .from('jurispurama_users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()
  if (!juriUser) {
    return NextResponse.json({ scans: [] })
  }

  const admin = createServiceClient()
  const { data: scans } = await admin
    .from('jurispurama_scans')
    .select(
      'id, case_id, file_name, file_path, mime_type, detected_type, insights, created_at'
    )
    .eq('user_id', juriUser.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Sign URLs fresh
  const withUrls = await Promise.all(
    (scans ?? []).map(async (s) => {
      const { data: signed } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(s.file_path, 3600)
      return { ...s, signed_url: signed?.signedUrl ?? null }
    })
  )

  // Silence unused APP_SCHEMA import
  void APP_SCHEMA

  return NextResponse.json({ scans: withUrls })
}
