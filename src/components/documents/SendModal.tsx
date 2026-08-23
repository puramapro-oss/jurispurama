'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import SendEmailForm from './SendModal/SendEmailForm'
import SendRecommandeForm from './SendModal/SendRecommandeForm'
import TeleserviceList from './SendModal/TeleserviceList'
import { teleservicesForType } from './SendModal/teleservices'

interface SendModalProps {
  documentId: string
  documentTitle: string
  caseType: string | null
  open: boolean
  onClose: () => void
  onSent: () => void
}

type TabId = 'email' | 'recommande' | 'teleservice'

export default function SendModal({
  documentId,
  documentTitle,
  caseType,
  open,
  onClose,
  onSent,
}: SendModalProps) {
  const [tab, setTab] = useState<TabId>('email')
  const [loading, setLoading] = useState(false)

  const [recEmail, setRecEmail] = useState('')
  const [recEmailName, setRecEmailName] = useState('')
  const [subject, setSubject] = useState(`Document juridique — ${documentTitle}`)
  const [bodyMessage, setBodyMessage] = useState('')

  const [recName, setRecName] = useState('')
  const [recStreet, setRecStreet] = useState('')
  const [recZip, setRecZip] = useState('')
  const [recCity, setRecCity] = useState('')
  const [recCountry, setRecCountry] = useState('FR')
  const [recEmailOpt, setRecEmailOpt] = useState('')

  useEffect(() => {
    if (open) {
      setSubject(`Document juridique — ${documentTitle}`)
    }
  }, [open, documentTitle])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const handleEmailSend = async () => {
    if (!recEmail.trim() || !recEmailName.trim()) {
      toast.error('Indique le nom et l\'email du destinataire.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recEmail.trim(),
          recipientName: recEmailName.trim(),
          subject: subject.trim(),
          bodyMessage: bodyMessage.trim(),
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error ?? 'Envoi impossible.')
      }
      toast.success('📧 Email envoyé avec succès.')
      onSent()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecommandeSend = async () => {
    if (!recName.trim() || !recStreet.trim() || !recZip.trim() || !recCity.trim()) {
      toast.error('Adresse destinataire incomplète.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(
        `/api/documents/${documentId}/send-recommande`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientName: recName.trim(),
            recipientEmail: recEmailOpt.trim() || undefined,
            recipientAddress: {
              street: recStreet.trim(),
              zip: recZip.trim(),
              city: recCity.trim(),
              country: recCountry.trim() || 'FR',
            },
          }),
        }
      )
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(err?.error ?? 'Envoi impossible.')
      }
      const data = (await res.json()) as {
        tracking_number: string
        mode: 'live' | 'simulated'
      }
      toast.success(
        `📮 Recommandé déposé — suivi ${data.tracking_number}${
          data.mode === 'simulated' ? ' (démo)' : ''
        }`
      )
      onSent()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setLoading(false)
    }
  }

  const teleservices = teleservicesForType(caseType)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-label="Envoyer le document"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-4">
          <div>
            <h2 className="font-serif text-xl font-semibold text-[var(--justice)]">
              Envoyer le document
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

        <div className="flex gap-1 border-b border-[var(--border)] bg-[var(--bg-nebula)] px-2 py-2">
          {(
            [
              { id: 'email', label: '📧 Email', hint: 'Rapide' },
              { id: 'recommande', label: '📮 Recommandé AR', hint: '5,99 €' },
              { id: 'teleservice', label: '🏛 Téléservice', hint: 'Officiel' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                tab === t.id
                  ? 'bg-white text-[var(--justice)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--justice)]'
              }`}
            >
              <div>{t.label}</div>
              <div className="mt-0.5 text-[10px] font-normal opacity-70">
                {t.hint}
              </div>
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'email' && (
            <SendEmailForm
              recEmailName={recEmailName}
              recEmail={recEmail}
              subject={subject}
              bodyMessage={bodyMessage}
              onRecEmailNameChange={setRecEmailName}
              onRecEmailChange={setRecEmail}
              onSubjectChange={setSubject}
              onBodyMessageChange={setBodyMessage}
              onSubmit={handleEmailSend}
              onCancel={onClose}
              loading={loading}
            />
          )}

          {tab === 'recommande' && (
            <SendRecommandeForm
              recName={recName}
              recStreet={recStreet}
              recZip={recZip}
              recCity={recCity}
              recCountry={recCountry}
              recEmailOpt={recEmailOpt}
              onRecNameChange={setRecName}
              onRecStreetChange={setRecStreet}
              onRecZipChange={setRecZip}
              onRecCityChange={setRecCity}
              onRecCountryChange={setRecCountry}
              onRecEmailOptChange={setRecEmailOpt}
              onSubmit={handleRecommandeSend}
              onCancel={onClose}
              loading={loading}
            />
          )}

          {tab === 'teleservice' && (
            <TeleserviceList teleservices={teleservices} />
          )}
        </div>
      </div>
    </div>
  )
}
