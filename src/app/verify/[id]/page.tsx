import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

interface DocRow {
  id: string
  case_id: string
  type: string
  title: string
  signature_status: string
  signature_request_id: string | null
  sent_status: string
  sent_at: string | null
  created_at: string
  storage_path: string | null
  deleted_at: string | null
}

interface CaseRow {
  id: string
  user_id: string
  type: string
}

interface UserRow {
  id: string
  full_name: string | null
}

interface SignatureRow {
  signed_at: string
  ip_address: string | null
}

async function loadPublic(id: string): Promise<{
  doc: DocRow
  caseRow: CaseRow
  sender: UserRow
  signature: SignatureRow | null
  signedPdfUrl: string | null
} | null> {
  const admin = createServiceClient()
  const { data: doc } = await admin
    .from('jurispurama_documents')
    .select(
      'id, case_id, type, title, signature_status, signature_request_id, sent_status, sent_at, created_at, storage_path, deleted_at'
    )
    .eq('id', id)
    .maybeSingle()

  if (!doc || doc.deleted_at) return null
  // Public page is only valid if doc was sent
  if (doc.sent_status === 'not_sent') return null

  const { data: caseRow } = await admin
    .from('jurispurama_cases')
    .select('id, user_id, type')
    .eq('id', doc.case_id)
    .maybeSingle()
  if (!caseRow) return null

  const { data: sender } = await admin
    .from('jurispurama_users')
    .select('id, full_name')
    .eq('id', caseRow.user_id)
    .maybeSingle()
  if (!sender) return null

  const { data: sig } = await admin
    .from('jurispurama_signatures')
    .select('signed_at, ip_address')
    .eq('document_id', doc.id)
    .order('signed_at', { ascending: false })
    .maybeSingle()

  let signedPdfUrl: string | null = null
  if (doc.storage_path && doc.signature_status === 'signed') {
    const signedPath = doc.storage_path.replace(/\.pdf$/, '-signed.pdf')
    const { data: signed } = await admin.storage
      .from('jurispurama-documents')
      .createSignedUrl(signedPath, 60 * 60)
    signedPdfUrl = signed?.signedUrl ?? null
  }

  return {
    doc: doc as DocRow,
    caseRow: caseRow as CaseRow,
    sender: sender as UserRow,
    signature: (sig as SignatureRow) ?? null,
    signedPdfUrl,
  }
}

export default async function VerifyDocumentPage({ params }: PageProps) {
  const { id } = await params
  const data = await loadPublic(id)
  if (!data) notFound()

  const { doc, sender, signature, signedPdfUrl } = data
  const senderName = sender.full_name ?? 'Utilisateur JurisPurama'

  return (
    <div className="min-h-screen bg-[var(--bg-parchment,#F6F4EE)] py-10 px-4">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--justice)]"
          >
            <span className="text-2xl" aria-hidden="true">
              ⚖
            </span>
            <span className="font-serif text-xl font-semibold">JurisPurama</span>
          </Link>
        </header>

        <div className="overflow-hidden rounded-3xl border border-[var(--border,rgba(30,58,95,0.08))] bg-white shadow-xl">
          <div className="bg-gradient-to-br from-[#1E3A5F] to-[#274d78] p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                <span className="text-2xl">✓</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#C9A84C]">
                  Vérification officielle
                </p>
                <h1 className="font-serif text-2xl font-semibold">
                  Document authentifié
                </h1>
              </div>
            </div>
            <div className="mt-4 h-[3px] w-14 rounded-full bg-[#C9A84C]" />
          </div>

          <div className="space-y-5 p-6">
            <p className="text-sm leading-relaxed text-[var(--text-secondary,#4B5563)]">
              Ce document a bien été généré et signé électroniquement via
              JurisPurama. Son intégrité est garantie par une empreinte
              cryptographique SHA-256 et son envoi a été tracé.
            </p>

            <dl className="grid gap-3 rounded-2xl bg-[#F8FAFC] p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                  Document
                </dt>
                <dd className="mt-0.5 font-semibold text-[var(--justice,#1E3A5F)]">
                  {doc.title}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                  Type
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--justice,#1E3A5F)]">
                  {doc.type.replace(/-/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                  Expéditeur
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--justice,#1E3A5F)]">
                  {senderName}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                  Date de génération
                </dt>
                <dd className="mt-0.5 font-medium text-[var(--justice,#1E3A5F)]">
                  {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              {signature && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                    Date de signature
                  </dt>
                  <dd className="mt-0.5 font-medium text-[var(--justice,#1E3A5F)]">
                    {new Date(signature.signed_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {doc.sent_at && (
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                    Envoyé le
                  </dt>
                  <dd className="mt-0.5 font-medium text-[var(--justice,#1E3A5F)]">
                    {new Date(doc.sent_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {doc.signature_request_id && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-wider text-[var(--text-muted,#64748B)]">
                    Empreinte de signature
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-[11px] text-[var(--justice,#1E3A5F)]">
                    {doc.signature_request_id}
                  </dd>
                </div>
              )}
            </dl>

            {signedPdfUrl && (
              <div className="overflow-hidden rounded-2xl border border-[var(--border,rgba(30,58,95,0.08))]">
                <iframe
                  src={signedPdfUrl}
                  title="Document signé"
                  className="h-[600px] w-full"
                />
              </div>
            )}

            <div className="rounded-xl border border-[#C9A84C]/30 bg-[#FDFBF5] p-4 text-xs text-[var(--text-secondary,#4B5563)]">
              <p className="font-semibold text-[#C9A84C]">
                ⚖ Valeur légale — Art. 1366 du Code civil
              </p>
              <p className="mt-1">
                La signature électronique a la même valeur juridique qu&apos;une
                signature manuscrite. L&apos;identité du signataire, l&apos;horodatage
                et l&apos;empreinte du document sont archivés dans un journal
                d&apos;audit conforme au RGPD.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-6 text-center text-xs text-[var(--text-muted,#64748B)]">
          <p>
            Édité par SASU PURAMA · 8 rue de la Chapelle, 25560 Frasne ·
            TVA non applicable, art. 293 B du CGI
          </p>
          <p className="mt-1">
            <Link
              href="/"
              className="font-semibold text-[var(--justice,#1E3A5F)] hover:underline"
            >
              Découvrir JurisPurama →
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
