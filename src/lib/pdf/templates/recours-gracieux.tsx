import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function RecoursGracieuxTemplate(props: PdfTemplateProps) {
  return (
    <BaseLetter
      {...props}
      documentHeading="RECOURS GRACIEUX"
    />
  )
}
