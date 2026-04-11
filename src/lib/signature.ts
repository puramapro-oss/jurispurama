import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import crypto from 'node:crypto'

export interface EmbedSignatureInput {
  pdfBuffer: Buffer | Uint8Array
  signaturePngBytes: Buffer | Uint8Array
  signerFullName: string
  signedAtISO: string
  ipAddress: string | null
}

/**
 * Embed a PNG signature on the LAST page of the PDF, positioned in the
 * bottom-right "signature" area used by the BaseLetter layout. Also adds a
 * small audit stamp under it.
 */
export async function embedSignatureOnPdf({
  pdfBuffer,
  signaturePngBytes,
  signerFullName,
  signedAtISO,
  ipAddress,
}: EmbedSignatureInput): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer)
  const pngImage = await pdfDoc.embedPng(signaturePngBytes)
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pages = pdfDoc.getPages()
  const lastPage = pages[pages.length - 1]
  const { width, height } = lastPage.getSize()

  // Target the bottom-right "Signature" area left by BaseLetter.
  // Page 595x842 (A4 points) with 2.5cm margins = 70pt. Signature block is ~160pt wide.
  // We keep width 150pt and place it ~70pt from right edge, ~120pt from bottom.
  const sigWidth = 150
  const aspect = pngImage.height / pngImage.width
  const sigHeight = sigWidth * aspect

  const sigX = width - 70 - sigWidth
  const sigY = 120

  lastPage.drawImage(pngImage, {
    x: sigX,
    y: sigY,
    width: sigWidth,
    height: Math.min(sigHeight, 70),
  })

  // Signer name line under the signature
  const nameText = signerFullName || 'Signature électronique'
  lastPage.drawText(nameText, {
    x: sigX,
    y: sigY - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.37),
  })

  // Audit stamp
  const stampDate = new Date(signedAtISO).toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  })
  const stamp = `Signé électroniquement le ${stampDate}${
    ipAddress ? ` — IP ${ipAddress}` : ''
  } · Art. 1366 Code civil`
  lastPage.drawText(stamp, {
    x: 70,
    y: 55,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.35),
  })

  const out = await pdfDoc.save()
  return Buffer.from(out)
}

export function hashSignatureBytes(
  signerFullName: string,
  pdfBytes: Buffer | Uint8Array,
  signedAtISO: string
): string {
  const h = crypto.createHash('sha256')
  h.update(signerFullName)
  h.update('|')
  h.update(signedAtISO)
  h.update('|')
  h.update(pdfBytes)
  return h.digest('hex')
}

/** Extract "data:image/png;base64,XXX" → Buffer */
export function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = dataUrl.match(/^data:image\/png;base64,(.+)$/)
  if (!match) return null
  try {
    return Buffer.from(match[1], 'base64')
  } catch {
    return null
  }
}

export function clientIpFromHeaders(h: Headers): string | null {
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() ?? null
  const real = h.get('x-real-ip')
  if (real) return real.trim()
  return null
}
