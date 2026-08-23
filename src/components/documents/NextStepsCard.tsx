'use client'

import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface NextStepsCardProps {
  isSigned: boolean
  sentStatus: 'not_sent' | 'sent_email' | 'sent_recommande' | 'sent_teleservice'
  onSignClick: () => void
  onSendClick: () => void
}

export default function NextStepsCard({
  isSigned,
  sentStatus,
  onSignClick,
  onSendClick,
}: NextStepsCardProps) {
  const handleSendClick = () => {
    if (!isSigned) {
      toast.info('Signe le document avant de l\'envoyer.')
      return
    }
    onSendClick()
  }

  return (
    <Card padding="md">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        Prochaines étapes
      </p>
      <ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">
        <li className="flex items-start gap-2">
          <span className={isSigned ? 'text-emerald-600' : ''}>
            {isSigned ? '✓' : '1.'}
          </span>
          <span>
            {isSigned ? (
              <>
                Document signé
                <span className="text-[var(--text-muted)]">
                  {' '}— prêt à l&apos;envoi
                </span>
              </>
            ) : (
              <>Relis ton document puis signe-le électroniquement.</>
            )}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className={sentStatus !== 'not_sent' ? 'text-emerald-600' : ''}>
            {sentStatus !== 'not_sent' ? '✓' : '2.'}
          </span>
          <span>
            {sentStatus === 'not_sent'
              ? 'Envoie par email ou recommandé AR24.'
              : 'Document transmis au destinataire.'}
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span>3.</span>
          <span>
            Suis les réponses et prépare une relance si besoin.
          </span>
        </li>
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        <Button
          variant="gold"
          size="sm"
          fullWidth
          onClick={onSignClick}
          disabled={isSigned}
        >
          {isSigned ? '✓ Déjà signé' : '✍️ Signer le document'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          onClick={handleSendClick}
          disabled={!isSigned}
        >
          📨 Envoyer
        </Button>
      </div>
    </Card>
  )
}
