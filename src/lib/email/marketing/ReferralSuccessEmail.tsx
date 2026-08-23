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

interface ReferralSuccessEmailProps {
  userName: string
  referralName: string
  amountEur: number
  walletUrl: string
}

export function ReferralSuccessEmail({
  userName,
  referralName,
  amountEur,
  walletUrl,
}: ReferralSuccessEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Félicitations ! Ton filleul vient de s&apos;abonner</Preview>
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
              🎉 Tu viens de gagner {amountEur.toLocaleString('fr-FR')} €
            </Heading>
            <Text style={p}>
              Bonne nouvelle, {userName} ! Ton filleul <strong>{referralName}</strong>{' '}
              vient de s&apos;abonner à JurisPurama. Conformément à notre programme
              de parrainage, tu touches <strong>50 % de son premier paiement</strong> —
              soit {amountEur.toLocaleString('fr-FR')} €.
            </Text>
            <Text style={p}>
              Les fonds sont déjà crédités sur ton wallet. Tu peux les retirer par
              virement IBAN dès 5 €.
            </Text>
            <Link href={walletUrl} style={ctaButton}>
              Voir mon wallet
            </Link>
            <Text style={{ ...p, marginTop: '24px', color: COLORS.MUTED, fontSize: '13px' }}>
              Tu toucheras également 10 % de ses paiements récurrents, à vie.
              Plus tu parraines, plus tu montes en palier — jusqu&apos;à 17 % de
              commission avec le palier Légende.
            </Text>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              Retrait IBAN sous 5 jours ouvrés. Aucun frais de retrait.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
