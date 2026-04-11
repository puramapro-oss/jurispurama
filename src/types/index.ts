export type PlanId = 'free' | 'essentiel' | 'pro' | 'avocat_virtuel'

export interface JurisUser {
  id: string
  auth_user_id: string
  email: string
  full_name: string | null
  phone: string | null
  address: Record<string, string> | null
  birth_date: string | null
  subscription_plan: PlanId
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  referral_code: string | null
  referred_by: string | null
  language: string
  role: 'user' | 'admin' | 'super_admin'
  created_at: string
  updated_at: string
}

export type CaseStatus =
  | 'diagnostic'
  | 'analyse'
  | 'document_pret'
  | 'signe'
  | 'envoye'
  | 'en_attente'
  | 'resolu'

export type CaseType =
  | 'amende'
  | 'travail'
  | 'logement'
  | 'consommation'
  | 'famille'
  | 'administratif'
  | 'fiscal'
  | 'penal'
  | 'sante'
  | 'assurance'
  | 'numerique'
  | 'affaires'

export interface JurisCase {
  id: string
  user_id: string
  type: CaseType
  sub_type: string | null
  status: CaseStatus
  summary: string | null
  strategy: Record<string, unknown> | null
  success_probability: number | null
  deadlines: Array<{
    date: string
    description: string
    critical: boolean
    notified: boolean
  }> | null
  money_saved: number
  created_at: string
  updated_at: string
}

export interface JurisMessage {
  id: string
  case_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments: Array<{
    url: string
    type: string
    name: string
    ocr_text?: string
  }> | null
  created_at: string
}

export interface JurisDocument {
  id: string
  case_id: string
  type: string
  title: string
  content: string | null
  pdf_url: string | null
  signed_pdf_url: string | null
  signature_status: 'pending' | 'signed' | 'expired'
  signature_request_id: string | null
  sent_status: 'not_sent' | 'sent_email' | 'sent_recommande' | 'sent_teleservice'
  sent_at: string | null
  sent_to: string | null
  tracking_number: string | null
  ar_received_at: string | null
  cost: number
  created_at: string
}
