import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function RequetePrudhommesTemplate(props: PdfTemplateProps) {
  return (
    <BaseLetter
      {...props}
      documentHeading="REQUÊTE AUX FINS DE SAISINE DU CONSEIL DE PRUD'HOMMES"
    />
  )
}
