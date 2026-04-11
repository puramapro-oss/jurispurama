import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type { PdfTemplateProps } from './types'

/**
 * Shared layout used by all JurisPurama PDF templates.
 * Classical french legal letter format :
 * 2.5cm margins, Times-Roman 11pt, expéditeur en haut à gauche,
 * destinataire en haut à droite, lieu+date, objet, corps, signature.
 */

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 71, // ~2.5 cm
    paddingBottom: 71,
    paddingLeft: 71,
    paddingRight: 71,
    fontSize: 11,
    fontFamily: 'Times-Roman',
    color: '#0F172A',
    lineHeight: 1.4,
  },
  brandHeader: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#C9A84C',
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    color: '#1E3A5F',
  },
  brandUrl: {
    fontSize: 9,
    color: '#64748B',
  },
  senderBlock: {
    marginBottom: 16,
  },
  recipientBlock: {
    marginBottom: 24,
    marginLeft: 260,
  },
  line: {
    marginBottom: 2,
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  italic: {
    fontFamily: 'Times-Italic',
  },
  dateLine: {
    textAlign: 'right',
    marginBottom: 24,
  },
  subject: {
    marginBottom: 16,
  },
  subjectLabel: {
    fontFamily: 'Times-Bold',
  },
  reference: {
    marginBottom: 16,
    fontSize: 10,
    color: '#475569',
  },
  salutation: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  conclusion: {
    marginTop: 16,
    marginBottom: 40,
    textAlign: 'justify',
  },
  signatureBlock: {
    marginTop: 36,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  signatureBox: {
    width: 220,
    borderTopWidth: 0.5,
    borderTopColor: '#94A3B8',
    paddingTop: 4,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  signatureName: {
    fontFamily: 'Times-Bold',
    marginTop: 2,
  },
  attachments: {
    marginTop: 24,
    fontSize: 10,
    color: '#334155',
  },
  attachmentsTitle: {
    fontFamily: 'Times-Bold',
    marginBottom: 4,
  },
  footnotes: {
    marginTop: 36,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#CBD5E1',
    fontSize: 9,
    color: '#475569',
  },
  footnoteLine: {
    marginBottom: 3,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 71,
    right: 71,
    textAlign: 'center',
    fontSize: 8,
    color: '#94A3B8',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 24,
    right: 71,
    fontSize: 8,
    color: '#94A3B8',
  },
})

function Address({ lines }: { lines: string[] }) {
  return (
    <View>
      {lines
        .filter((l) => l && l.trim().length > 0)
        .map((l, i) => (
          <Text key={i} style={pdfStyles.line}>
            {l}
          </Text>
        ))}
    </View>
  )
}

export interface BaseLetterProps extends PdfTemplateProps {
  /** e.g. "CONTESTATION DE L'AVIS DE CONTRAVENTION" */
  documentHeading?: string
  /** Optional extra sections specific to templates (rendered after legal_grounds) */
  extraSections?: Array<{ title: string; body: string }>
}

export function BaseLetter({
  profile,
  data,
  documentHeading,
  extraSections,
}: BaseLetterProps) {
  const senderName =
    data.header.sender_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    'Client JurisPurama'

  const senderAddressLines = data.header.sender_address
    ? data.header.sender_address.split('\n')
    : [
        profile?.address_street,
        [profile?.address_zip, profile?.address_city].filter(Boolean).join(' '),
        profile?.address_country ?? 'France',
      ].filter((l): l is string => !!l && l.trim().length > 0)

  const recipientAddressLines = data.header.recipient_address.split('\n')

  const today = new Date()
  const dateFr =
    data.header.date ||
    new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(today)

  const cityLine = data.header.city
    ? `${data.header.city}, le ${dateFr}`
    : `Le ${dateFr}`

  const facts = splitParagraphs(data.facts)
  const grounds = splitParagraphs(data.legal_grounds)
  const requests = splitParagraphs(data.requests)

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Brand header */}
        <View style={pdfStyles.brandHeader} fixed>
          <View>
            <Text style={pdfStyles.brandTitle}>⚖  JurisPurama</Text>
            <Text style={pdfStyles.brandUrl}>
              L&apos;assistant juridique IA — jurispurama.purama.dev
            </Text>
          </View>
          <Text style={pdfStyles.brandUrl}>
            Document généré automatiquement
          </Text>
        </View>

        {/* Sender */}
        <View style={pdfStyles.senderBlock}>
          <Text style={[pdfStyles.line, pdfStyles.bold]}>{senderName}</Text>
          <Address lines={senderAddressLines} />
          {profile?.phone && (
            <Text style={pdfStyles.line}>Tél. : {profile.phone}</Text>
          )}
          {profile?.email && (
            <Text style={pdfStyles.line}>Email : {profile.email}</Text>
          )}
        </View>

        {/* Recipient */}
        <View style={pdfStyles.recipientBlock}>
          <Text style={[pdfStyles.line, pdfStyles.bold]}>
            {data.header.recipient_name}
          </Text>
          <Address lines={recipientAddressLines} />
        </View>

        {/* Lieu et date */}
        <Text style={pdfStyles.dateLine}>{cityLine}</Text>

        {/* Ref */}
        {data.header.reference && (
          <Text style={pdfStyles.reference}>
            Référence : {data.header.reference}
          </Text>
        )}

        {/* Objet */}
        <View style={pdfStyles.subject}>
          <Text>
            <Text style={pdfStyles.subjectLabel}>Objet : </Text>
            {data.subject}
          </Text>
        </View>

        {documentHeading && (
          <Text
            style={[
              pdfStyles.sectionTitle,
              { textAlign: 'center', marginTop: 4, marginBottom: 12 },
            ]}
          >
            {documentHeading}
          </Text>
        )}

        {/* Salutation */}
        <Text style={pdfStyles.salutation}>{data.salutation}</Text>

        {/* Facts */}
        <Text style={pdfStyles.sectionTitle}>I. Rappel des faits</Text>
        {facts.map((p, i) => (
          <Text key={`f-${i}`} style={pdfStyles.paragraph}>
            {p}
          </Text>
        ))}

        {/* Legal grounds */}
        <Text style={pdfStyles.sectionTitle}>II. Moyens de droit</Text>
        {grounds.map((p, i) => (
          <Text key={`g-${i}`} style={pdfStyles.paragraph}>
            {p}
          </Text>
        ))}

        {extraSections?.map((s, i) => (
          <View key={`extra-${i}`} wrap={false}>
            <Text style={pdfStyles.sectionTitle}>{s.title}</Text>
            {splitParagraphs(s.body).map((p, j) => (
              <Text key={`extra-${i}-${j}`} style={pdfStyles.paragraph}>
                {p}
              </Text>
            ))}
          </View>
        ))}

        {/* Requests */}
        <Text style={pdfStyles.sectionTitle}>
          {extraSections?.length ? 'IV' : 'III'}. Demandes
        </Text>
        {requests.map((p, i) => (
          <Text key={`r-${i}`} style={pdfStyles.paragraph}>
            {p}
          </Text>
        ))}

        {/* Conclusion */}
        <Text style={pdfStyles.conclusion}>{data.conclusion}</Text>

        {/* Signature */}
        <View style={pdfStyles.signatureBlock}>
          <View style={pdfStyles.signatureBox}>
            <Text style={pdfStyles.signatureLabel}>
              Signature de {senderName}
            </Text>
            <Text style={pdfStyles.signatureName}>{senderName}</Text>
          </View>
        </View>

        {/* PJ */}
        {data.attachments && data.attachments.length > 0 && (
          <View style={pdfStyles.attachments} wrap={false}>
            <Text style={pdfStyles.attachmentsTitle}>Pièces jointes :</Text>
            {data.attachments.map((a, i) => (
              <Text key={`pj-${i}`}>— {a}</Text>
            ))}
          </View>
        )}

        {/* Footnotes */}
        {data.footnotes && data.footnotes.length > 0 && (
          <View style={pdfStyles.footnotes} wrap={false}>
            {data.footnotes.map((n, i) => (
              <Text key={`fn-${i}`} style={pdfStyles.footnoteLine}>
                {n.marker} {n.text}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={pdfStyles.pageFooter} fixed>
          Document généré par JurisPurama — SASU PURAMA, 8 Rue de la Chapelle,
          25560 Frasne (France) — TVA non applicable, art. 293 B du CGI —
          Valeur probante sous réserve de signature manuscrite ou électronique.
        </Text>
        <Text
          style={pdfStyles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}

function splitParagraphs(text: string): string[] {
  if (!text) return ['']
  return text
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}
