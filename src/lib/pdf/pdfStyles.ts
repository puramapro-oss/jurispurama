import { StyleSheet } from '@react-pdf/renderer'

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
