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
} from './styles'

interface WinbackEmailProps {
  userName: string
  dashboardUrl: string
}

export function WinbackEmail({ userName, dashboardUrl }: WinbackEmailProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>Tu nous as manqué, {userName} 💛</Preview>
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
              On se revoit, {userName} ?
            </Heading>
            <Text style={p}>
              Ça fait 30 jours qu&apos;on ne t&apos;a pas vu. On voulait juste te
              dire : si tu as un problème juridique en suspens — même un petit —
              JurisIA est là, prêt à t&apos;aider en 3 minutes.
            </Text>
            <Text style={p}>
              Quelques situations où on peut te faire gagner du temps (et de
              l&apos;argent) :
            </Text>
            <Text style={p}>
              • Contester une amende ou un redressement 🚗
              <br />• Récupérer un dépôt de garantie bloqué 🏠
              <br />• Obtenir un remboursement refusé 🛒
              <br />• Envoyer une mise en demeure à un impayé 💼
            </Text>
            <Link href={dashboardUrl} style={ctaButton}>
              Reprendre un dossier
            </Link>
          </Section>
          <Section style={footer}>
            <Text style={{ margin: 0 }}>
              Pour ne plus recevoir ces rappels, désabonne-toi dans ton espace.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
