'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import SignaturePad from '@/components/signature/SignaturePad'

interface SignModalProps {
  documentId: string
  documentTitle: string
  open: boolean
  onClose: () => void
  onSigned: (signedUrl: string | null, signedAt: string) => void
}

export default function SignModal({
  documentId,
  documentTitle,
  open,
  onClose,
  onSigned,
}: SignModalProps) {
  const [consent, setConsent] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setConsent(false)
    setDataUrl(null)
    setLoading(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleSign = async () => {
    if (!dataUrl) {
      toast.error('Dessine ta signature avant de valider.')
      return
    }
    if (!consent) {
      toast.error('Coche la case de consentement pour signer.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureDataUrl: dataUrl,
          consent: true,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error ?? 'Signature impossible.')
      }
      const data = (await res.json()) as {
        signed_pdf_url: string | null
        signed_at: string
      }
      toast.success('✍️ Document signé avec succès.')
      onSigned(data.signed_pdf_url, data.signed_at)
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Signature impossible.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label="Signer le document"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Signer électroniquement
            </h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-[var(--text-muted)]">
              {documentTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-nebula)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-[var(--justice)]/20 bg-[var(--justice)]/5 p-3 text-xs text-[var(--text-secondary)]">
            Ta signature manuscrite a la même valeur juridique qu&apos;une
            signature papier (Art. 1366 du Code civil). Elle est incrustée dans
            le PDF, horodatée, et son empreinte SHA-256 est archivée avec ton
            adresse IP pour traçabilité.
          </div>

          <SignaturePad onReady={setDataUrl} disabled={loading} />

          <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-white p-3 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--justice)]"
              data-testid="sign-consent"
            />
            <span>
              Je reconnais avoir lu le document « {documentTitle} » et je
              consens à le signer électroniquement. Cette signature a valeur
              d&apos;engagement juridique.
            </span>
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variant="gold"
              size="md"
              onClick={handleSign}
              loading={loading}
              disabled={!dataUrl || !consent}
            >
              ✍️ Signer le document
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
