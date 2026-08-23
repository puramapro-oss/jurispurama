// Type definitions for subscription plans

export type PlanSlug = 'essentiel' | 'pro' | 'avocat_virtuel'
export type Billing = 'monthly' | 'yearly'

export interface PlanCard {
  slug: PlanSlug | 'free'
  label: string
  monthly: number // cents
  yearly: number // cents
  yearlyMonthlyBarred: number // what "avant -30%" look like
  features: string[]
  popular?: boolean
  cta: string
}
