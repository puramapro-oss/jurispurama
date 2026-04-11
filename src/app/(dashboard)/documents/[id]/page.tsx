'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { DOCUMENT_TEMPLATE_LABELS, type DocumentTemplate } from '@/lib/pdf/types'

interface DocumentRow {
  id: string
  case_id: string
  type: string
  title: string
  content: string | null
  generated_data: unknown
  pdf_url: string | null
  signature_status: 'pending' | 'signed' | 'expired'
  sent_status:
    | 'not_sent'
    | 'sent_email'
    | 'sent_recommande'
    | 'sent_teleservice'
  created_at: string
}

interface CaseSummary {
  id: string
  summary: string | null
  type: string
  status: string
}

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [doc, setDoc] = useState<DocumentRow | null>(null)
  const [caseRow, setCaseRow] = useState<CaseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenOpen, setRegenOpen] = useState(false)
  const [regenText, setRegenText] = useState('')
  const [regenLoading, setRegenLoading] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/documents/${id}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) {
            toast.error('Document introuvable.')
            router.replace('/documents')
            return null
          }
          throw new Error('load')
        }
        return (await r.json()) as {
          document: DocumentRow
          case: CaseSummary
        }
      })
      .then((data) => {
        if (!active || !data) return
        setDoc(data.document)
        setCaseRow(data.case)
      })
      .catch(() => {
        if (active) toast.error('Impossible de charger le document.')
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id, router])

  const handleDelete = useCallback(async () => {
    if (!doc) return
    if (
      !confirm(
        'Supprimer ce document ? Cette action est irréversible.'
      )
    )
      return
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('delete')
      toast.success('Document supprimé.')
      router.push('/documents')
    } catch {
      toast.error('Impossible de supprimer ce document.')
    }
  }, [doc, router])

  const handleRegenerate = useCallback(async () => {
    if (!doc || !caseRow) return
    if (!regenText.trim()) {
      toast.error('Ajoute tes précisions avant de régénérer.')
      return
    }
    setRegenLoading(true)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: caseRow.id,
          documentType: doc.type,
          title: doc.title,
          instructions: regenText.trim(),
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error ?? 'Régénération impossible.')
      }
      const data = (await res.json()) as { documentId: string }
      toast.success('Nouveau document généré.')
      router.push(`/documents/${data.documentId}`)
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Régénération impossible.'
      toast.error(msg)
    } finally {
      setRegenLoading(false)
    }
  }, [doc, caseRow, regenText, router])

  if (loading) {
    return (
      <div className="container-narrow py-10">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-white/60" />
        <div className="mt-5 h-[60vh] animate-pulse rounded-2xl bg-white/60" />
      </div>
    )
  }

  if (!doc || !caseRow) return null

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-5 flex flex-col gap-2">
        <nav className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/documents" className="hover:text-[var(--justice)]">
            Documents
          </Link>
          <span>/</span>
          <span className="truncate">{doc.title}</span>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-[var(--justice)] md:text-3xl">
              {doc.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="purple" size="sm">
                {DOCUMENT_TEMPLATE_LABELS[doc.type as DocumentTemplate] ??
                  doc.type}
              </Badge>
              <Badge
                variant={
                  doc.signature_status === 'signed' ? 'green' : 'amber'
                }
                size="sm"
              >
                {doc.signature_status === 'signed'
                  ? '✓ Signé'
                  : '⏳ À signer'}
              </Badge>
              <span className="text-xs text-[var(--text-muted)]">
                Généré le{' '}
                {new Date(doc.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {doc.pdf_url && (
              <a
                href={doc.pdf_url}
                target="_blank"
                rel="noreferrer"
                download
              >
                <Button variant="primary" size="sm">
                  ⬇ Télécharger
                </Button>
              </a>
            )}
            <Link href={`/chat/${caseRow.id}`}>
              <Button variant="secondary" size="sm">
                Retour au dossier
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-[1.5fr_1fr]">
        {/* PDF preview */}
        <Card padding="sm" className="overflow-hidden">
          {doc.pdf_url ? (
            <iframe
              src={doc.pdf_url}
              className="h-[70vh] min-h-[520px] w-full rounded-xl border border-[var(--border)]"
              title={doc.title}
            />
          ) : (
            <div className="flex h-[520px] items-center justify-center text-sm text-[var(--text-muted)]">
              Aperçu indisponible.
            </div>
          )}
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          <Card padding="md">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Dossier associé
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-[var(--text-primary)]">
              {caseRow.summary ?? 'Dossier sans titre'}
            </p>
            <Link
              href={`/chat/${caseRow.id}`}
              className="mt-2 inline-block text-xs font-semibold text-[var(--justice)] hover:underline"
            >
              Reprendre la conversation →
            </Link>
          </Card>

          <Card padding="md">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Prochaines étapes
            </p>
            <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
              <li className="flex items-start gap-2">
                <span>1.</span>
                <span>
                  Relis ton document et télécharge-le si tout te convient.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>2.</span>
                <span>
                  <strong>Signer électroniquement</strong> (bientôt disponible —
                  P4).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span>3.</span>
                <span>
                  <strong>Envoyer</strong> par email ou recommandé AR24
                  (bientôt — P4).
                </span>
              </li>
            </ul>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="gold"
                size="sm"
                fullWidth
                onClick={() =>
                  toast.info(
                    'La signature électronique DocuSeal sera active dans la prochaine mise à jour.'
                  )
                }
              >
                ✍️ Signer le document
              </Button>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                onClick={() =>
                  toast.info(
                    "L'envoi automatique (email + recommandé AR24) sera actif dans la prochaine mise à jour."
                  )
                }
              >
                📨 Envoyer
              </Button>
            </div>
          </Card>

          <Card padding="md">
            <button
              type="button"
              onClick={() => setRegenOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="font-medium text-[var(--justice)]">
                🔁 Régénérer avec modifications
              </span>
              <span
                className={`text-lg transition-transform ${
                  regenOpen ? 'rotate-180' : ''
                }`}
              >
                ⌄
              </span>
            </button>
            {regenOpen && (
              <div className="mt-3">
                <textarea
                  value={regenText}
                  onChange={(e) => setRegenText(e.target.value)}
                  rows={4}
                  placeholder="Précise ce que tu veux changer : ajouter un argument, modifier un montant, changer le destinataire…"
                  className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRegenerate}
                    loading={regenLoading}
                  >
                    Régénérer
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card padding="md">
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={handleDelete}
            >
              Supprimer le document
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
