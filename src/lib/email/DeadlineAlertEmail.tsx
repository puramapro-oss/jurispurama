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

interface DeadlineAlertEmailProps {
  userName: string
  caseTitle: string
  deadlineDescription: string
  daysLeft: number
  deadlineDate: string
  caseUrl: string
}

export function DeadlineAlertEmail({
  userName,
  caseTitle,
  deadlineDescription,
  daysLeft,
  deadlineDate,
  caseUrl,
}: DeadlineAlertEmailProps) {
  const urgencyText =
    daysLeft <= 1
      ? '🚨 Délai imminent'
      : daysLeft <= 3
        ? '⚠️ Délai urgent'
        : '⏰ Délai proche'
  return (
    <Html lang="fr">
      <Head />
      <Preview>
        {urgencyText} — {caseTitle}
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
              {urgencyText}
            </Heading>
            <Text style={p}>Bonjour {userName},</Text>
            <Text style={p}>
              Un délai critique approche pour ton dossier{' '}
              <strong>{caseTitle}</strong>.
            </Text>
            <Text
              style={{
                ...p,
                backgroundColor: daysLeft <= 1 ? '#FEF2F2' : '#FFFBEB',
                borderLeft: `4px solid ${daysLeft <= 1 ? '#DC2626' : GOLD}`,
                padding: '14px 18px',
                borderRadius: '8px',
              }}
            >
              <strong>{deadlineDescription}</strong>
              <br />
              <span style={{ color: MUTED }}>
                Date limite :{' '}
                {new Date(deadlineDate).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}{' '}
                — {daysLeft <= 0 ? "aujourd'hui" : `dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
              </span>
            </Text>
            <Text style={p}>
              <Link
                href={caseUrl}
                style={{
                  display: 'inline-block',
                  backgroundColor: JUSTICE,
                  color: '#FFFFFF',
                  padding: '12px 22px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                Ouvrir mon dossier
              </Link>
            </Text>
            <Text style={{ ...p, color: MUTED, fontSize: '13px' }}>
              Ne laisse pas passer ce délai — JurisIA peut préparer les
              documents nécessaires en quelques minutes.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              Pour arrêter ces alertes, gère tes préférences dans ton espace
              JurisPurama.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
