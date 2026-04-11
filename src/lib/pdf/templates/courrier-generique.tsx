import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function CourrierGeneriqueTemplate(props: PdfTemplateProps) {
  return <BaseLetter {...props} />
}
