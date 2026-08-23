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

interface Day1TipEmailProps {
  userName: string
  dashboardUrl: string
}

export function Day1TipEmail({ userName, dashboardUrl }: Day1TipEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>L&apos;astuce du jour — contester une amende gagne 78 % du temps</Preview>
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
              Le saviez-tu, {userName} ? 💡
            </Heading>
            <Text style={p}>
              <strong>78 % des contestations d&apos;amende de stationnement</strong>{' '}
              aboutissent positivement quand elles citent l&apos;article R417-10
              du Code de la route (signalisation claire et lisible).
            </Text>
            <Text style={p}>
              Si tu as une amende en cours, JurisIA peut générer ta lettre de
              contestation en moins de 2 minutes, avec les bons articles et la
              bonne forme. Zéro jargon, tu signes et tu envoies.
            </Text>
            <Link href={dashboardUrl} style={ctaButton}>
              Scanner mon amende
            </Link>
            <Text style={{ ...p, marginTop: '24px', color: COLORS.MUTED, fontSize: '13px' }}>
              Chaque semaine, nous partageons une astuce juridique pour t&apos;aider
              à ne plus jamais payer inutilement.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              Pour te désabonner de ces tips, clique sur « Gérer mes préférences »
              dans ton espace.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
