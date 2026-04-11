import type { JurisCase } from '@/types'

export interface PdfProfile {
  civility?: string | null
  first_name?: string | null
  last_name?: string | null
  birth_date?: string | null
  birth_city?: string | null
  phone?: string | null
  email?: string | null
  address_street?: string | null
  address_zip?: string | null
  address_city?: string | null
  address_country?: string | null
  license_plate?: string | null
  vehicle_brand?: string | null
  vehicle_model?: string | null
  driver_license_number?: string | null
  employer_name?: string | null
  employer_address?: string | null
  job_title?: string | null
  hire_date?: string | null
  salary_gross?: number | null
  salary_net?: number | null
  contract_type?: string | null
  is_tenant?: boolean | null
  landlord_name?: string | null
  landlord_address?: string | null
  rent_amount?: number | null
  lease_start_date?: string | null
  iban?: string | null
  bank_name?: string | null
  social_security_number?: string | null
  tax_number?: string | null
}

export interface PdfFootnote {
  marker: string
  text: string
}

export interface PdfGeneratedContent {
  // Header section (above "Objet")
  header: {
    recipient_name: string
    recipient_address: string // multi-line
    sender_name?: string
    sender_address?: string
    reference?: string // ex: "N° dossier : 12345"
    city?: string // ville émission
    date?: string // date ISO ou FR
  }
  subject: string // Objet: XXX
  salutation: string // "Madame, Monsieur,"
  // Main body sections
  facts: string // Rappel des faits
  legal_grounds: string // Moyens de droit (cite des articles)
  requests: string // Demandes / prétentions
  conclusion: string // Formule de politesse
  footnotes?: PdfFootnote[] // Notes de bas de page (articles)
  // PJ / pièces jointes
  attachments?: string[]
}

export type DocumentTemplate =
  | 'contestation-amende'
  | 'mise-en-demeure'
  | 'requete-prudhommes'
  | 'reclamation-client'
  | 'courrier-generique'
  | 'declaration-sinistre'
  | 'recours-gracieux'

export interface PdfTemplateProps {
  profile: PdfProfile | null
  case: Pick<JurisCase, 'id' | 'type' | 'sub_type' | 'summary' | 'strategy'>
  data: PdfGeneratedContent
  title: string
}

export const DOCUMENT_TEMPLATE_LABELS: Record<DocumentTemplate, string> = {
  'contestation-amende': 'Contestation d\'amende',
  'mise-en-demeure': 'Mise en demeure',
  'requete-prudhommes': 'Requête aux prud\'hommes',
  'reclamation-client': 'Réclamation consommateur',
  'courrier-generique': 'Courrier juridique',
  'declaration-sinistre': 'Déclaration de sinistre',
  'recours-gracieux': 'Recours gracieux',
}

// Suggestion : given a case type, which templates are relevant?
export function templatesForCaseType(type: string): DocumentTemplate[] {
  switch (type) {
    case 'amende':
      return ['contestation-amende', 'recours-gracieux', 'courrier-generique']
    case 'travail':
      return ['requete-prudhommes', 'mise-en-demeure', 'courrier-generique']
    case 'logement':
      return ['mise-en-demeure', 'courrier-generique', 'recours-gracieux']
    case 'consommation':
      return ['reclamation-client', 'mise-en-demeure', 'courrier-generique']
    case 'administratif':
      return ['recours-gracieux', 'courrier-generique']
    case 'assurance':
      return ['declaration-sinistre', 'mise-en-demeure', 'courrier-generique']
    case 'fiscal':
      return ['recours-gracieux', 'courrier-generique']
    case 'affaires':
      return ['mise-en-demeure', 'courrier-generique']
    default:
      return ['courrier-generique', 'mise-en-demeure', 'recours-gracieux']
  }
}
