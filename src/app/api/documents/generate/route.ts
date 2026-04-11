import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createServiceClient } from '@/lib/supabase'
import { generateDocumentPdf } from '@/lib/pdf/generator'
import { DOCUMENT_TEMPLATE_LABELS, type DocumentTemplate } from '@/lib/pdf/types'
import { decryptString } from '@/lib/encryption'
import { ENCRYPTED_FIELDS } from '@/lib/profile-schema'
import type { JurisCase } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 180
export const dynamic = 'force-dynamic'

const BUCKET = 'jurispurama-documents'

const bodySchema = z.object({
  caseId: z.string().uuid(),
  documentType: z.enum([
    'contestation-amende',
    'mise-en-demeure',
    'requete-prudhommes',
    'reclamation-client',
    'courrier-generique',
    'declaration-sinistre',
    'recours-gracieux',
  ]),
  title: z.string().trim().min(3).max(200),
  instructions: z.string().trim().max(4000).optional().nullable(),
})

function monthlyQuota(
  plan: string | null | undefined
): number | 'unlimited' {
  const p = plan ?? 'free'
  if (p === 'free') return 0
  if (p === 'essentiel') return 5
  return 'unlimited' // pro, avocat_virtuel
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      {
        error:
          'Connecte-toi pour générer un document juridique.',
      },
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
      { error: 'Profil introuvable.' },
      { status: 404 }
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    const json = await req.json()
    body = bodySchema.parse(json)
  } catch {
    return NextResponse.json(
      {
        error:
          'Requête invalide. caseId, documentType et title sont requis.',
      },
      { status: 400 }
    )
  }

  // Quota check
  const quota = monthlyQuota(juriUser.subscription_plan)
  const isAdmin = juriUser.role === 'super_admin'
  if (quota === 0 && !isAdmin) {
    return NextResponse.json(
      {
        error:
          'La génération de documents est réservée aux abonnés Essentiel et supérieurs. Passe à l\'offre Essentiel pour générer jusqu\'à 5 documents/mois.',
      },
      { status: 402 }
    )
  }
  if (typeof quota === 'number' && !isAdmin) {
    const admin = createServiceClient()
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { data: usage } = await admin
      .from('jurispurama_documents')
      .select('id, created_at, case_id')
      .gte('created_at', startOfMonth.toISOString())
      .is('deleted_at', null)
    const mine = (usage ?? []).filter(async () => true)
    // Re-check via join
    const { count } = await admin
      .from('jurispurama_documents')
      .select('id, case_id!inner(user_id)', {
        count: 'exact',
        head: true,
      })
      .gte('created_at', startOfMonth.toISOString())
      .is('deleted_at', null)
      .eq('case_id.user_id', juriUser.id)
    void mine
    if ((count ?? 0) >= quota) {
      return NextResponse.json(
        {
          error: `Quota atteint (${quota} documents/mois sur le plan ${juriUser.subscription_plan}). Passe à Pro pour des documents illimités.`,
        },
        { status: 402 }
      )
    }
  }

  // Load case (RLS ensures ownership)
  const { data: caseRow, error: caseErr } = await supabase
    .from('jurispurama_cases')
    .select('id, user_id, type, sub_type, summary, strategy, status')
    .eq('id', body.caseId)
    .maybeSingle()

  if (caseErr || !caseRow) {
    return NextResponse.json(
      {
        error: 'Dossier introuvable ou inaccessible.',
      },
      { status: 404 }
    )
  }

  // Load legal profile (decrypt sensitive fields for injection in PDF)
  const { data: legalRaw } = await supabase
    .from('jurispurama_legal_profiles')
    .select('*')
    .eq('user_id', juriUser.id)
    .maybeSingle()

  let profile: Record<string, unknown> | null = null
  if (legalRaw) {
    profile = { ...legalRaw } as Record<string, unknown>
    for (const f of ENCRYPTED_FIELDS) {
      const v = profile[f]
      if (typeof v === 'string') profile[f] = decryptString(v)
    }
  }

  // Load last messages for context
  const { data: history } = await supabase
    .from('jurispurama_messages')
    .select('role, content, created_at')
    .eq('case_id', caseRow.id)
    .order('created_at', { ascending: true })
    .limit(24)

  const excerpt = (history ?? [])
    .map((m) => `[${m.role}] ${m.content.slice(0, 1200)}`)
    .join('\n\n')

  // Generate PDF via JurisIA + react-pdf
  let pdfBuffer: Buffer
  let generatedContent: unknown
  try {
    const result = await generateDocumentPdf({
      templateId: body.documentType as DocumentTemplate,
      title: body.title,
      caseRow: caseRow as Pick<
        JurisCase,
        'id' | 'type' | 'sub_type' | 'summary' | 'strategy'
      >,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      profile: profile as any,
      conversationExcerpt: excerpt,
      instructions: body.instructions ?? null,
    })
    pdfBuffer = result.buffer
    generatedContent = result.content
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'erreur inconnue'
    return NextResponse.json(
      {
        error: `Impossible de générer le document : ${msg}`,
      },
      { status: 500 }
    )
  }

  // Upload to storage
  const admin = createServiceClient()
  const timestamp = Date.now()
  const storagePath = `${user.id}/${caseRow.id}/${timestamp}-${body.documentType}.pdf`

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadErr) {
    return NextResponse.json(
      {
        error: `Impossible de stocker le PDF : ${uploadErr.message}`,
      },
      { status: 500 }
    )
  }

  const { data: signed } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60 * 24 * 30) // 30 days

  // Persist document row
  const { data: doc, error: docErr } = await admin
    .from('jurispurama_documents')
    .insert({
      case_id: caseRow.id,
      type: body.documentType,
      title: body.title,
      content: JSON.stringify(generatedContent),
      generated_data: generatedContent,
      pdf_url: signed?.signedUrl ?? null,
      storage_path: storagePath,
      signature_status: 'pending',
      sent_status: 'not_sent',
      cost: 0,
    })
    .select('id')
    .maybeSingle()

  if (docErr || !doc) {
    // Cleanup orphan file
    await admin.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json(
      {
        error:
          'Impossible d\'enregistrer le document en base. Réessaie dans un instant.',
      },
      { status: 500 }
    )
  }

  // Update case status → document_pret
  await admin
    .from('jurispurama_cases')
    .update({
      status: 'document_pret',
      updated_at: new Date().toISOString(),
    })
    .eq('id', caseRow.id)

  // Inject an assistant message notifying the document is ready
  await admin.from('jurispurama_messages').insert({
    case_id: caseRow.id,
    role: 'assistant',
    content: `📄 **Document généré : ${DOCUMENT_TEMPLATE_LABELS[body.documentType as DocumentTemplate]}**

Le document "${body.title}" est prêt. Tu peux le consulter, le télécharger, puis le signer et l'envoyer.

[Voir le document](/documents/${doc.id})`,
    attachments: [
      {
        url: signed?.signedUrl ?? '',
        type: 'application/pdf',
        name: `${body.title}.pdf`,
      },
    ],
  })

  return NextResponse.json({
    documentId: doc.id,
    pdf_url: signed?.signedUrl ?? null,
    preview_url: signed?.signedUrl ?? null,
  })
}

// GET — list user documents (filters handled client-side)
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
  if (!juriUser) return NextResponse.json({ documents: [] })

  const admin = createServiceClient()
  const { data: cases } = await admin
    .from('jurispurama_cases')
    .select('id, summary, type')
    .eq('user_id', juriUser.id)

  const caseIds = (cases ?? []).map((c) => c.id)
  if (caseIds.length === 0) return NextResponse.json({ documents: [] })

  const { data: docs } = await admin
    .from('jurispurama_documents')
    .select(
      'id, case_id, type, title, pdf_url, signature_status, sent_status, storage_path, created_at'
    )
    .in('case_id', caseIds)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const withCase = (docs ?? []).map((d) => {
    const c = (cases ?? []).find((cc) => cc.id === d.case_id)
    return {
      ...d,
      case_summary: c?.summary ?? null,
      case_type: c?.type ?? null,
    }
  })

  return NextResponse.json({ documents: withCase })
}
