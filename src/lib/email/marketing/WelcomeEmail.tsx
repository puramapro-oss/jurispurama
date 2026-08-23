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
import {
  main,
  container,
  headerBar,
  brandTitle,
  goldLine,
  body,
  h1,
  p,
  footer,
  ctaButton,
  COLORS,
} from './styles'

interface WelcomeEmailProps {
  userName: string
  dashboardUrl: string
}

export function WelcomeEmail({ userName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Bienvenue sur JurisPurama — ton avocat IA est prêt</Preview>
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
              Bienvenue {userName} 👋
            </Heading>
            <Text style={p}>
              Je suis JurisIA, ton assistant juridique. À partir de maintenant, tu
              as accès à un avocat IA disponible 24h/24, qui cite systématiquement
              les articles de loi et te propose un plan d&apos;action concret —
              pas du jargon.
            </Text>
            <Text style={p}>
              Pour commencer, ouvre ton premier dossier en moins de 2 minutes.
              Raconte-moi ta situation comme tu le ferais à un ami.
            </Text>
            <Link href={dashboardUrl} style={ctaButton}>
              Ouvrir mon premier dossier
            </Link>
            <Text style={{ ...p, marginTop: '24px', color: COLORS.MUTED, fontSize: '13px' }}>
              Tu as 3 consultations gratuites et 14 jours d&apos;essai Premium —
              sans carte bancaire. Aucune mauvaise surprise.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              JurisPurama — SASU PURAMA, 8 rue de la Chapelle, 25560 Frasne.
              TVA non applicable art. 293 B du CGI.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
