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
import { main, container, headerBar, brandTitle, goldLine, body, h1, p, footer, JUSTICE, GOLD, MUTED } from './styles'

interface DocumentSentEmailProps {
  senderName: string
  senderEmail: string
  recipientName: string
  documentTitle: string
  bodyMessage: string
  verifyUrl: string
}

export function DocumentSentEmail({
  senderName,
  senderEmail,
  recipientName,
  documentTitle,
  bodyMessage,
  verifyUrl,
}: DocumentSentEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        Document juridique de {senderName} — {documentTitle}
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
              {documentTitle}
            </Heading>
            <Text style={p}>Madame, Monsieur {recipientName},</Text>
            <Text style={p}>
              Vous trouverez ci-joint un document juridique vous concernant,
              envoyé par <strong>{senderName}</strong> via JurisPurama.
            </Text>
            {bodyMessage && (
              <Text
                style={{
                  ...p,
                  backgroundColor: '#F8FAFC',
                  borderLeft: `3px solid ${GOLD}`,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {bodyMessage}
              </Text>
            )}
            <Text style={p}>
              Vous pouvez répondre directement à cet email à l&apos;adresse{' '}
              <Link href={`mailto:${senderEmail}`} style={{ color: JUSTICE }}>
                {senderEmail}
              </Link>{' '}
              pour toute question.
            </Text>
            <Text style={p}>
              Ce document a été signé électroniquement conformément à
              l&apos;article 1366 du Code civil.
            </Text>
            <Hr
              style={{
                border: 0,
                borderTop: `1px solid rgba(30,58,95,0.1)`,
                margin: '18px 0',
              }}
            />
            <Text style={{ ...p, fontSize: '13px', color: MUTED }}>
              Vérifier l&apos;authenticité du document :{' '}
              <Link href={verifyUrl} style={{ color: JUSTICE }}>
                {verifyUrl}
              </Link>
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              JurisPurama — édité par SASU PURAMA, 8 rue de la Chapelle, 25560
              Frasne, France. TVA non applicable, art. 293 B du CGI. Service
              non juridictionnel ne se substituant pas à un avocat.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
