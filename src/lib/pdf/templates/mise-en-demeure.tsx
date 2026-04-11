import { BaseLetter } from '../base'
import type { PdfTemplateProps } from '../types'

export default function MiseEnDemeureTemplate(props: PdfTemplateProps) {
  return (
    <BaseLetter
      {...props}
      documentHeading="MISE EN DEMEURE"
      extraSections={[
        {
          title: 'III. Délai de mise en demeure',
          body:
            "Conformément aux dispositions des articles 1231-5 et suivants du Code civil, vous disposez d'un délai de HUIT (8) JOURS à compter de la réception du présent courrier pour vous exécuter.\n\nÀ défaut d'exécution dans ce délai, je me réserve la possibilité d'engager toute action judiciaire utile afin d'obtenir satisfaction, sans nouvelle mise en garde, y compris par voie d'assignation ou de requête en injonction de payer (articles 1405 et suivants du Code de procédure civile), et ce à vos entiers frais et risques.",
        },
      ]}
    />
  )
}
