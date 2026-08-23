// Type definitions for financer (financial aid search)

export interface Aide {
  id: string
  nom: string
  type_aide: string
  profil_eligible: string[]
  situation_eligible: string[]
  montant_max: number | null
  url_officielle: string | null
  description: string
  region: string | null
  handicap_only: boolean
}

export type Step = 1 | 2 | 3 | 4
