import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { main, container, headerBar, brandTitle, goldLine, body, h1, p, footer, JUSTICE, MUTED } from './styles'

interface DocumentSentConfirmationProps {
  userName: string
  documentTitle: string
  recipient: string
  channel: 'email' | 'recommande'
  trackingNumber: string | null
  docUrl: string
}

export function DocumentSentConfirmation({
  userName,
  documentTitle,
  recipient,
  channel,
  trackingNumber,
  docUrl,
}: DocumentSentConfirmationProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Confirmation d&apos;envoi — {documentTitle}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={headerBar}>
            <Heading as="h1" style={brandTitle}>
              ⚖ JurisPurama
            </Heading>
            <Hr style={goldLine} />
          </Section>
          <Section style={body}>
            <Heading as="h2" style={h1}>
              {channel === 'recommande' ? 'Dépôt confirmé par le fournisseur' : 'Envoi confirmé'}
            </Heading>
            <Text style={p}>
              Bonjour {userName}, ton document{' '}
              <strong>{documentTitle}</strong> a bien été envoyé à{' '}
              <strong>{recipient}</strong> le{' '}
              {new Date().toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}{' '}
              par{' '}
              {channel === 'email'
                ? 'email avec pièce jointe'
                : 'recommandé électronique avec accusé de réception'}
              .
            </Text>
            {trackingNumber && (
              <Text style={p}>
                Numéro de suivi :{' '}
                <strong style={{ color: JUSTICE }}>{trackingNumber}</strong>
              </Text>
            )}
            <Text style={p}>
              Consulte le document et le suivi dans ton espace :{' '}
              <Link href={docUrl} style={{ color: JUSTICE }}>
                Voir le document
              </Link>
            </Text>
            <Text style={{ ...p, color: MUTED, fontSize: '13px' }}>
              Pour un recommandé, une notification de suivi pourra être envoyée
              si le fournisseur confirme sa remise. Le statut de dépôt ne prouve
              pas la réception par le destinataire.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              JurisPurama — suivi documentaire.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
