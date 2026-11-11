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
import { main, container, headerBar, brandTitle, goldLine, body, h1, p, footer, JUSTICE } from './styles'

interface ARReceivedEmailProps {
  userName: string
  documentTitle: string
  recipient: string
  receivedAtISO: string
  docUrl: string
}

export function ARReceivedEmail({
  userName,
  documentTitle,
  recipient,
  receivedAtISO,
  docUrl,
}: ARReceivedEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Remise signalée par le fournisseur — {documentTitle}</Preview>
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
              📬 Suivi du recommandé
            </Heading>
            <Text style={p}>Bonjour {userName},</Text>
            <Text style={p}>
              Le fournisseur signale la remise de ton recommandé{' '}
              <strong>{documentTitle}</strong> à{' '}
              <strong>{recipient}</strong> le{' '}
              {new Date(receivedAtISO).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              .
            </Text>
            <Text style={p}>
              Ce message présente un statut de suivi. Il ne confirme pas
              l&apos;archivage d&apos;une preuve d&apos;accusé de réception.
              Conserve les justificatifs délivrés par le fournisseur.
              <Link
                href={docUrl}
                style={{
                  display: 'inline-block',
                  marginTop: '12px',
                  backgroundColor: JUSTICE,
                  color: '#FFFFFF',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Voir le document
              </Link>
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
