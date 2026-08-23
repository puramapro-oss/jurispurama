'use client'

import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { DOCUMENT_TEMPLATE_LABELS, type DocumentTemplate } from '@/lib/pdf/types'

interface DocumentHeaderProps {
  doc: {
    title: string
    type: string
    created_at: string
    signature_status: 'pending' | 'signed' | 'expired'
    sent_status: 'not_sent' | 'sent_email' | 'sent_recommande' | 'sent_teleservice'
    pdf_url: string | null
    signed_pdf_url: string | null
  }
  caseId: string
}

function sentBadge(status: string): {
  label: string
  variant: 'green' | 'amber' | 'purple' | 'gray'
} | null {
  switch (status) {
    case 'sent_email':
      return { label: '📧 Envoyé par email', variant: 'green' }
    case 'sent_recommande':
      return { label: '📮 Recommandé déposé', variant: 'purple' }
    case 'sent_teleservice':
      return { label: '🏛 Déposé en téléservice', variant: 'gray' }
    default:
      return null
  }
}

export default function DocumentHeader({ doc, caseId }: DocumentHeaderProps) {
  const isSigned = doc.signature_status === 'signed'
  const sentInfo = sentBadge(doc.sent_status)
  const previewUrl = doc.signed_pdf_url ?? doc.pdf_url

  return (
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
            <Badge variant={isSigned ? 'green' : 'amber'} size="sm">
              {isSigned ? '✓ Signé' : '⏳ À signer'}
            </Badge>
            {sentInfo && (
              <Badge variant={sentInfo.variant} size="sm">
                {sentInfo.label}
              </Badge>
            )}
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
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              download
            >
              <Button variant="primary" size="sm">
                ⬇ Télécharger
              </Button>
            </a>
          )}
          <Link href={`/chat/${caseId}`}>
            <Button variant="secondary" size="sm">
              Retour au dossier
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
