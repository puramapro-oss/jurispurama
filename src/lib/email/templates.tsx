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

const JUSTICE = '#1E3A5F'
const GOLD = '#C9A84C'
const BG = '#F6F4EE'
const TEXT = '#2C3E50'
const MUTED = '#64748B'

const main = {
  backgroundColor: BG,
  fontFamily:
    '"Helvetica Neue", Helvetica, Arial, "Segoe UI", Roboto, sans-serif',
  padding: '24px 0',
}

const container = {
  backgroundColor: '#FFFFFF',
  maxWidth: '600px',
  margin: '0 auto',
  borderRadius: '16px',
  overflow: 'hidden',
  border: '1px solid rgba(30,58,95,0.08)',
  boxShadow: '0 10px 30px rgba(30,58,95,0.08)',
}

const headerBar = {
  background: `linear-gradient(135deg, ${JUSTICE} 0%, #274d78 100%)`,
  padding: '24px 32px',
  color: '#FFFFFF',
}

const brandTitle = {
  color: '#FFFFFF',
  fontSize: '22px',
  fontWeight: 700,
  margin: 0,
  letterSpacing: '0.5px',
  fontFamily:
    '"Cormorant Garamond", Georgia, "Times New Roman", serif',
}

const goldLine = {
  height: '3px',
  width: '60px',
  backgroundColor: GOLD,
  marginTop: '10px',
  border: 0,
}

const body = { padding: '28px 32px', color: TEXT, fontSize: '15px', lineHeight: '1.65' }
const h1 = {
  color: JUSTICE,
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 12px',
}
const p = { color: TEXT, margin: '0 0 14px', fontSize: '15px', lineHeight: '1.65' }
const footer = {
  padding: '20px 32px',
  backgroundColor: '#F8FAFC',
  borderTop: '1px solid rgba(30,58,95,0.06)',
  color: MUTED,
  fontSize: '11px',
  lineHeight: '1.5',
}

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
              ✓ Envoi confirmé
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
              Tu recevras une nouvelle notification dès que le destinataire
              aura accusé réception (pour les recommandés).
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              JurisPurama — SASU PURAMA, 8 rue de la Chapelle, 25560 Frasne.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

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
      <Preview>Accusé de réception reçu — {documentTitle}</Preview>
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
              📬 Accusé de réception
            </Heading>
            <Text style={p}>Bonjour {userName},</Text>
            <Text style={p}>
              Bonne nouvelle : ton recommandé{' '}
              <strong>{documentTitle}</strong> a été remis à{' '}
              <strong>{recipient}</strong> le{' '}
              {new Date(receivedAtISO).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              .
            </Text>
            <Text style={p}>
              La preuve d&apos;AR est horodatée et archivée dans ton dossier.
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
              JurisPurama — SASU PURAMA, Frasne.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
