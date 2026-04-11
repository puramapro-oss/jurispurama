import { z } from 'zod'

// Loose helpers — all fields optional (progressive profile)
const optionalString = () =>
  z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v))

const optionalDate = () =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : AAAA-MM-JJ')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) => (v === '' || v == null ? null : v))

const optionalNumber = () =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null || v === '') return null
      const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
      return Number.isFinite(n) ? n : null
    })

const zipFr = () =>
  z
    .string()
    .trim()
    .regex(/^\d{5}$/, 'Code postal invalide (5 chiffres)')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) => (v === '' || v == null ? null : v))

const phoneFr = () =>
  z
    .string()
    .trim()
    .regex(
      /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
      'Numéro français invalide'
    )
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) => (v === '' || v == null ? null : v))

const ibanLoose = () =>
  z
    .string()
    .trim()
    .min(14)
    .max(40)
    .regex(/^[A-Z]{2}\d{2}[A-Z0-9]+$/i, 'IBAN invalide')
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) => (v === '' || v == null ? null : v?.toUpperCase().replace(/\s/g, '') ?? null))

const ssnFr = () =>
  z
    .string()
    .trim()
    .regex(
      /^[12]\s*\d{2}\s*\d{2}\s*\d{2}\s*\d{3}\s*\d{3}\s*\d{2}$/,
      'N° sécurité sociale invalide (15 chiffres)'
    )
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) => (v === '' || v == null ? null : v?.replace(/\s/g, '') ?? null))

const licensePlateFr = () =>
  z
    .string()
    .trim()
    .min(5)
    .max(12)
    .optional()
    .nullable()
    .or(z.literal('').transform(() => null))
    .transform((v) =>
      v === '' || v == null ? null : v?.toUpperCase().replace(/\s/g, '') ?? null
    )

export const legalProfileSchema = z.object({
  // Identity
  civility: z.enum(['M.', 'Mme', 'Autre']).optional().nullable(),
  first_name: optionalString(),
  last_name: optionalString(),
  birth_date: optionalDate(),
  birth_city: optionalString(),
  nationality: optionalString(),
  // Contact
  phone: phoneFr(),
  email: z.string().trim().email('Email invalide').optional().nullable().or(z.literal('').transform(() => null)),
  address_street: optionalString(),
  address_zip: zipFr(),
  address_city: optionalString(),
  address_country: optionalString(),
  // Véhicule
  license_plate: licensePlateFr(),
  vehicle_brand: optionalString(),
  vehicle_model: optionalString(),
  driver_license_number: optionalString(), // encrypted
  // Emploi
  employer_name: optionalString(),
  employer_address: optionalString(),
  job_title: optionalString(),
  hire_date: optionalDate(),
  salary_gross: optionalNumber(),
  salary_net: optionalNumber(),
  contract_type: z
    .enum(['CDI', 'CDD', 'Intérim', 'Apprentissage', 'Stage', 'Autre'])
    .optional()
    .nullable(),
  // Logement
  is_tenant: z.boolean().optional().nullable(),
  landlord_name: optionalString(),
  landlord_address: optionalString(),
  rent_amount: optionalNumber(),
  lease_start_date: optionalDate(),
  // Bancaire & officiel (encrypted)
  social_security_number: ssnFr(), // encrypted
  tax_number: optionalString(), // encrypted
  iban: ibanLoose(), // encrypted
  bank_name: optionalString(),
})

export type LegalProfileInput = z.infer<typeof legalProfileSchema>

// List of encrypted fields — applied in API route before insert/update
export const ENCRYPTED_FIELDS = [
  'social_security_number',
  'iban',
  'tax_number',
  'driver_license_number',
] as const

export type EncryptedField = (typeof ENCRYPTED_FIELDS)[number]

// Profile completion sections (for progress rings & UI grouping)
export interface ProfileSection {
  id: string
  label: string
  icon: string
  fields: Array<keyof LegalProfileInput>
}

export const PROFILE_SECTIONS: ProfileSection[] = [
  {
    id: 'identite',
    label: 'Identité',
    icon: '🪪',
    fields: [
      'civility',
      'first_name',
      'last_name',
      'birth_date',
      'birth_city',
      'nationality',
    ],
  },
  {
    id: 'contact',
    label: 'Contact & Adresse',
    icon: '📍',
    fields: [
      'phone',
      'email',
      'address_street',
      'address_zip',
      'address_city',
      'address_country',
    ],
  },
  {
    id: 'vehicule',
    label: 'Véhicule',
    icon: '🚗',
    fields: [
      'license_plate',
      'vehicle_brand',
      'vehicle_model',
      'driver_license_number',
    ],
  },
  {
    id: 'emploi',
    label: 'Emploi',
    icon: '💼',
    fields: [
      'employer_name',
      'employer_address',
      'job_title',
      'hire_date',
      'contract_type',
      'salary_gross',
      'salary_net',
    ],
  },
  {
    id: 'logement',
    label: 'Logement',
    icon: '🏠',
    fields: [
      'is_tenant',
      'landlord_name',
      'landlord_address',
      'rent_amount',
      'lease_start_date',
    ],
  },
  {
    id: 'bancaire',
    label: 'Bancaire & Officiel',
    icon: '🏦',
    fields: [
      'bank_name',
      'iban',
      'social_security_number',
      'tax_number',
    ],
  },
]

export function countFilled(
  profile: Partial<LegalProfileInput> | null | undefined,
  fields: Array<keyof LegalProfileInput>
): number {
  if (!profile) return 0
  let c = 0
  for (const f of fields) {
    const v = profile[f]
    if (v == null) continue
    if (typeof v === 'string' && v.trim() === '') continue
    c++
  }
  return c
}

export function totalFields(): number {
  return PROFILE_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0)
}

export function profileCompletion(
  profile: Partial<LegalProfileInput> | null | undefined
): number {
  const total = totalFields()
  if (!profile || total === 0) return 0
  const filled = PROFILE_SECTIONS.reduce(
    (acc, s) => acc + countFilled(profile, s.fields),
    0
  )
  return Math.round((filled / total) * 100)
}
