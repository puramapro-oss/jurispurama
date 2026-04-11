import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function DeclarationSinistreTemplate(props: PdfTemplateProps) {
  return (
    <BaseLetter
      {...props}
      documentHeading="DÉCLARATION DE SINISTRE"
    />
  )
}
