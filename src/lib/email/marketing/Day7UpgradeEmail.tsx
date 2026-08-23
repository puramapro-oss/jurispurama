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

interface Day7UpgradeEmailProps {
  userName: string
  upgradeUrl: string
}

export function Day7UpgradeEmail({ userName, upgradeUrl }: Day7UpgradeEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>-20 % sur ton premier mois avec le code WELCOME20 (48h)</Preview>
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
              {userName}, une offre à ne pas rater 🎁
            </Heading>
            <Text style={p}>
              Ça fait une semaine que tu es avec nous. Pour te remercier, nous
              t&apos;offrons <strong>-20 % sur ton premier mois</strong> en passant
              à JurisPurama Pro — le plan le plus choisi.
            </Text>
            <Text
              style={{
                ...p,
                background: '#FFFBEB',
                borderLeft: `4px solid ${COLORS.GOLD}`,
                padding: '14px 18px',
                borderRadius: '10px',
                fontSize: '16px',
              }}
            >
              Code promo : <strong>WELCOME20</strong>
              <br />
              Valable 48 heures — ensuite, il disparaît.
            </Text>
            <Link href={upgradeUrl} style={ctaButton}>
              Activer mon code WELCOME20
            </Link>
            <Text style={{ ...p, marginTop: '24px', color: COLORS.MUTED, fontSize: '13px' }}>
              Avec Pro : documents illimités, 3 recommandés AR inclus chaque
              mois, profil juridique complet, alertes deadlines automatiques.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              Offre réservée aux utilisateurs inscrits depuis moins de 30 jours.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
