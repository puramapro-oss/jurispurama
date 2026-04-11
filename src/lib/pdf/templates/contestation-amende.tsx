import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function ContestationAmendeTemplate(props: PdfTemplateProps) {
  return (
    <BaseLetter
      {...props}
      documentHeading="CONTESTATION DE L'AVIS DE CONTRAVENTION"
    />
  )
}
