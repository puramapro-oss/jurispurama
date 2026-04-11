import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function ReclamationClientTemplate(props: PdfTemplateProps) {
  return (
    <BaseLetter
      {...props}
      documentHeading="RÉCLAMATION — DROITS DU CONSOMMATEUR"
    />
  )
}
