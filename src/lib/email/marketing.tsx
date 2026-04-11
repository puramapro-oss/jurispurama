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
  fontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
}
const goldLine = {
  height: '3px',
  width: '60px',
  backgroundColor: GOLD,
  marginTop: '10px',
  border: 0,
}
const body = {
  padding: '28px 32px',
  color: TEXT,
  fontSize: '15px',
  lineHeight: '1.65',
}
const h1 = {
  color: JUSTICE,
  fontSize: '24px',
  fontWeight: 700,
  margin: '0 0 14px',
}
const p = {
  color: TEXT,
  margin: '0 0 14px',
  fontSize: '15px',
  lineHeight: '1.65',
}
const footer = {
  padding: '20px 32px',
  backgroundColor: '#F8FAFC',
  borderTop: '1px solid rgba(30,58,95,0.06)',
  color: MUTED,
  fontSize: '11px',
  lineHeight: '1.5',
}
const ctaButton = {
  display: 'inline-block',
  background: `linear-gradient(135deg, ${JUSTICE} 0%, #2A5384 100%)`,
  color: '#FFFFFF',
  padding: '14px 26px',
  borderRadius: '12px',
  textDecoration: 'none',
  fontWeight: 700,
  fontSize: '14px',
  marginTop: '8px',
}

interface BaseProps {
  userName: string
}

interface WelcomeEmailProps extends BaseProps {
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
            <Text style={{ ...p, marginTop: '24px', color: MUTED, fontSize: '13px' }}>
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

interface Day1TipEmailProps extends BaseProps {
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
            <Text style={{ ...p, marginTop: '24px', color: MUTED, fontSize: '13px' }}>
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

interface Day7UpgradeEmailProps extends BaseProps {
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
                borderLeft: `4px solid ${GOLD}`,
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
            <Text style={{ ...p, marginTop: '24px', color: MUTED, fontSize: '13px' }}>
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

interface WinbackEmailProps extends BaseProps {
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

interface ReferralSuccessEmailProps extends BaseProps {
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
            <Text style={{ ...p, marginTop: '24px', color: MUTED, fontSize: '13px' }}>
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
