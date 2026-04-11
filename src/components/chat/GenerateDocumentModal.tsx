'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import {
  DOCUMENT_TEMPLATE_LABELS,
  templatesForCaseType,
  type DocumentTemplate,
} from '@/lib/pdf/types'

interface GenerateDocumentModalProps {
  open: boolean
  caseType: string
  defaultTitle?: string
  onClose: () => void
  onGenerate: (payload: {
    documentType: DocumentTemplate
    title: string
    instructions: string
  }) => Promise<void> | void
  loading?: boolean
}

export default function GenerateDocumentModal({
  open,
  caseType,
  defaultTitle,
  onClose,
  onGenerate,
  loading,
}: GenerateDocumentModalProps) {
  const suggested = templatesForCaseType(caseType)
  const [selected, setSelected] = useState<DocumentTemplate>(
    suggested[0] ?? 'courrier-generique'
  )
  const [title, setTitle] = useState(
    defaultTitle ?? DOCUMENT_TEMPLATE_LABELS[suggested[0] ?? 'courrier-generique']
  )
  const [instructions, setInstructions] = useState('')

  useEffect(() => {
    if (!open) return
    const next = suggested[0] ?? 'courrier-generique'
    setSelected(next)
    setTitle(defaultTitle ?? DOCUMENT_TEMPLATE_LABELS[next])
    setInstructions('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseType])

  if (!open) return null

  const handleSubmit = async () => {
    if (!title.trim()) return
    await onGenerate({
      documentType: selected,
      title: title.trim(),
      instructions: instructions.trim(),
    })
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#0F172A]/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Générer un document juridique
            </h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              JurisIA rédige le document à partir de ton dossier et ton profil.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-xl text-[var(--text-muted)] hover:text-[var(--justice)]"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="doc-type"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
          >
            Type de document
          </label>
          <select
            id="doc-type"
            value={selected}
            onChange={(e) => {
              const v = e.target.value as DocumentTemplate
              setSelected(v)
              setTitle(DOCUMENT_TEMPLATE_LABELS[v])
            }}
            className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
          >
            {(Object.entries(DOCUMENT_TEMPLATE_LABELS) as Array<
              [DocumentTemplate, string]
            >).map(([value, label]) => (
              <option key={value} value={value}>
                {suggested.includes(value) ? '⭐ ' : ''}
                {label}
              </option>
            ))}
          </select>
          {suggested.length > 0 && (
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              ⭐ Recommandés pour ce type de dossier ({caseType}).
            </p>
          )}
        </div>

        <div className="mb-4">
          <label
            htmlFor="doc-title"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
          >
            Titre du document
          </label>
          <input
            id="doc-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="doc-instructions"
            className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
          >
            Précisions (optionnel)
          </label>
          <textarea
            id="doc-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="Ex : mentionne le numéro de PV 1234567, le montant de 90€, l'argument du flashage à 138 km/h autoroute…"
            className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="md" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="gold"
            size="md"
            onClick={handleSubmit}
            loading={loading}
            disabled={!title.trim()}
          >
            Générer le PDF
          </Button>
        </div>
      </div>
    </div>
  )
}
