'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface SendModalProps {
  documentId: string
  documentTitle: string
  caseType: string | null
  open: boolean
  onClose: () => void
  onSent: () => void
}

type TabId = 'email' | 'recommande' | 'teleservice'

interface TeleserviceLink {
  label: string
  url: string
  description: string
  copy: string[]
}

function teleservicesForType(type: string | null): TeleserviceLink[] {
  switch (type) {
    case 'amende':
      return [
        {
          label: 'ANTAI — Contestation amende',
          url: 'https://www.antai.gouv.fr/',
          description:
            'Téléservice officiel pour contester une amende ou un avis de contravention.',
          copy: [
            "Numéro d'avis",
            'Immatriculation',
            'Motif de contestation (issu du document)',
          ],
        },
        {
          label: 'Telerecours citoyens',
          url: 'https://www.telerecours.fr/',
          description: 'Recours devant les juridictions administratives.',
          copy: ['Identité complète', 'Objet du recours', 'Pièces justificatives'],
        },
      ]
    case 'fiscal':
      return [
        {
          label: 'impots.gouv.fr — Messagerie sécurisée',
          url: 'https://www.impots.gouv.fr/accueil',
          description:
            'Réclamation fiscale, remise gracieuse, contestation taxe.',
          copy: [
            'Numéro fiscal',
            'Référence de l\'avis',
            'Texte de la réclamation',
          ],
        },
      ]
    case 'administratif':
      return [
        {
          label: 'Telerecours citoyens',
          url: 'https://www.telerecours.fr/',
          description:
            'Dépôt direct auprès des tribunaux administratifs et cours.',
          copy: ['Objet', 'Moyens', 'Pièces jointes signées'],
        },
        {
          label: 'Service-public.fr',
          url: 'https://www.service-public.fr/particuliers/vosdroits/N367',
          description: 'Portail de recours gracieux auprès de l\'administration.',
          copy: ['Identité', 'Référence', 'Courrier joint'],
        },
      ]
    default:
      return [
        {
          label: 'Service-public.fr',
          url: 'https://www.service-public.fr/',
          description: 'Portail des démarches administratives françaises.',
          copy: ['Identité complète', 'Objet', 'Pièces jointes'],
        },
      ]
  }
}

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

  // Email fields
  const [recEmail, setRecEmail] = useState('')
  const [recEmailName, setRecEmailName] = useState('')
  const [subject, setSubject] = useState(`Document juridique — ${documentTitle}`)
  const [bodyMessage, setBodyMessage] = useState('')

  // Recommandé fields
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

        {/* Tabs */}
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
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleEmailSend()
              }}
              className="space-y-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Nom du destinataire"
                  value={recEmailName}
                  onChange={(e) => setRecEmailName(e.target.value)}
                  placeholder="Madame Dupont"
                  required
                />
                <Input
                  label="Email du destinataire"
                  type="email"
                  value={recEmail}
                  onChange={(e) => setRecEmail(e.target.value)}
                  placeholder="destinataire@exemple.fr"
                  required
                />
              </div>
              <Input
                label="Objet"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Message (facultatif)
                </label>
                <textarea
                  value={bodyMessage}
                  onChange={(e) => setBodyMessage(e.target.value)}
                  rows={4}
                  placeholder="Message court à joindre à l'email…"
                  className="w-full resize-none rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
                />
              </div>
              <div className="rounded-xl bg-[var(--bg-nebula)] p-3 text-xs text-[var(--text-secondary)]">
                Le PDF signé sera joint automatiquement. Les réponses du
                destinataire arriveront dans ta boîte mail.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  loading={loading}
                >
                  Envoyer l&apos;email
                </Button>
              </div>
            </form>
          )}

          {tab === 'recommande' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleRecommandeSend()
              }}
              className="space-y-3"
            >
              <Input
                label="Nom du destinataire"
                value={recName}
                onChange={(e) => setRecName(e.target.value)}
                placeholder="Maître Dupont / Société XYZ"
                required
              />
              <Input
                label="Adresse (rue, numéro)"
                value={recStreet}
                onChange={(e) => setRecStreet(e.target.value)}
                placeholder="12 rue de la Paix"
                required
              />
              <div className="grid gap-3 sm:grid-cols-[120px_1fr_120px]">
                <Input
                  label="Code postal"
                  value={recZip}
                  onChange={(e) => setRecZip(e.target.value)}
                  placeholder="75001"
                  required
                />
                <Input
                  label="Ville"
                  value={recCity}
                  onChange={(e) => setRecCity(e.target.value)}
                  placeholder="Paris"
                  required
                />
                <Input
                  label="Pays"
                  value={recCountry}
                  onChange={(e) => setRecCountry(e.target.value)}
                  placeholder="FR"
                />
              </div>
              <Input
                label="Email (facultatif, pour notification AR)"
                type="email"
                value={recEmailOpt}
                onChange={(e) => setRecEmailOpt(e.target.value)}
                placeholder="destinataire@exemple.fr"
              />
              <div className="rounded-xl border border-[var(--gold)]/30 bg-[var(--gold)]/5 p-3 text-xs text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--gold-dark)]">
                  ✉ Recommandé électronique AR — 5,99 €
                </p>
                <p className="mt-1">
                  Valeur juridique équivalente à une lettre recommandée AR
                  papier. Preuve d&apos;envoi horodatée et accusé de réception
                  stockés dans ton dossier. Inclus dans les forfaits Pro
                  (3/mois) et Avocat Virtuel (illimité).
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={onClose}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="gold"
                  size="md"
                  loading={loading}
                >
                  Déposer le recommandé
                </Button>
              </div>
            </form>
          )}

          {tab === 'teleservice' && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                Les téléservices officiels acceptent le dépôt direct en ligne.
                Ouvre le portail concerné, puis copie-colle les champs
                ci-dessous depuis ton document.
              </p>
              <ul className="space-y-3">
                {teleservices.map((t) => (
                  <li
                    key={t.url}
                    className="rounded-xl border border-[var(--border)] bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--justice)]">
                          {t.label}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          {t.description}
                        </p>
                      </div>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer noopener"
                      >
                        <Button variant="secondary" size="sm">
                          Ouvrir
                        </Button>
                      </a>
                    </div>
                    <div className="mt-3 rounded-lg bg-[var(--bg-nebula)] p-2">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                        À copier depuis le PDF :
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-[var(--text-secondary)]">
                        {t.copy.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[var(--text-muted)]">
                Pense à télécharger le PDF signé avant d&apos;aller sur le
                téléservice.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
