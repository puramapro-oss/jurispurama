'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import {
  PROFILE_SECTIONS,
  countFilled,
  profileCompletion,
  totalFields,
  type LegalProfileInput,
  type ProfileSection,
} from '@/lib/profile-schema'

type ProfileState = Partial<LegalProfileInput>

const ENCRYPTED_KEYS: Array<keyof LegalProfileInput> = [
  'iban',
  'social_security_number',
  'tax_number',
  'driver_license_number',
]

interface FieldMeta {
  key: keyof LegalProfileInput
  label: string
  type:
    | 'text'
    | 'email'
    | 'tel'
    | 'date'
    | 'number'
    | 'select'
    | 'boolean'
    | 'password'
  placeholder?: string
  options?: Array<{ value: string; label: string }>
}

const FIELD_META: Record<keyof LegalProfileInput, FieldMeta> = {
  civility: {
    key: 'civility',
    label: 'Civilité',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'M.', label: 'M.' },
      { value: 'Mme', label: 'Mme' },
      { value: 'Autre', label: 'Autre' },
    ],
  },
  first_name: {
    key: 'first_name',
    label: 'Prénom',
    type: 'text',
    placeholder: 'Jean',
  },
  last_name: {
    key: 'last_name',
    label: 'Nom',
    type: 'text',
    placeholder: 'Dupont',
  },
  birth_date: { key: 'birth_date', label: 'Date de naissance', type: 'date' },
  birth_city: {
    key: 'birth_city',
    label: 'Ville de naissance',
    type: 'text',
    placeholder: 'Paris',
  },
  nationality: {
    key: 'nationality',
    label: 'Nationalité',
    type: 'text',
    placeholder: 'Française',
  },
  phone: {
    key: 'phone',
    label: 'Téléphone',
    type: 'tel',
    placeholder: '06 12 34 56 78',
  },
  email: {
    key: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'jean.dupont@example.com',
  },
  address_street: {
    key: 'address_street',
    label: 'Adresse (rue)',
    type: 'text',
    placeholder: '12 rue des Lilas',
  },
  address_zip: {
    key: 'address_zip',
    label: 'Code postal',
    type: 'text',
    placeholder: '75001',
  },
  address_city: {
    key: 'address_city',
    label: 'Ville',
    type: 'text',
    placeholder: 'Paris',
  },
  address_country: {
    key: 'address_country',
    label: 'Pays',
    type: 'text',
    placeholder: 'France',
  },
  license_plate: {
    key: 'license_plate',
    label: 'Plaque d\'immatriculation',
    type: 'text',
    placeholder: 'AB-123-CD',
  },
  vehicle_brand: {
    key: 'vehicle_brand',
    label: 'Marque du véhicule',
    type: 'text',
    placeholder: 'Renault',
  },
  vehicle_model: {
    key: 'vehicle_model',
    label: 'Modèle',
    type: 'text',
    placeholder: 'Clio',
  },
  driver_license_number: {
    key: 'driver_license_number',
    label: 'Numéro de permis',
    type: 'password',
    placeholder: '••••••••',
  },
  employer_name: {
    key: 'employer_name',
    label: 'Employeur',
    type: 'text',
    placeholder: 'Acme SARL',
  },
  employer_address: {
    key: 'employer_address',
    label: 'Adresse employeur',
    type: 'text',
    placeholder: '1 avenue des Champs, 75008 Paris',
  },
  job_title: {
    key: 'job_title',
    label: 'Poste',
    type: 'text',
    placeholder: 'Chef de projet',
  },
  hire_date: { key: 'hire_date', label: 'Date d\'embauche', type: 'date' },
  salary_gross: {
    key: 'salary_gross',
    label: 'Salaire brut (€/mois)',
    type: 'number',
    placeholder: '3500',
  },
  salary_net: {
    key: 'salary_net',
    label: 'Salaire net (€/mois)',
    type: 'number',
    placeholder: '2700',
  },
  contract_type: {
    key: 'contract_type',
    label: 'Type de contrat',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'CDI', label: 'CDI' },
      { value: 'CDD', label: 'CDD' },
      { value: 'Intérim', label: 'Intérim' },
      { value: 'Apprentissage', label: 'Apprentissage' },
      { value: 'Stage', label: 'Stage' },
      { value: 'Autre', label: 'Autre' },
    ],
  },
  is_tenant: {
    key: 'is_tenant',
    label: 'Statut logement',
    type: 'select',
    options: [
      { value: '', label: '—' },
      { value: 'true', label: 'Locataire' },
      { value: 'false', label: 'Propriétaire' },
    ],
  },
  landlord_name: {
    key: 'landlord_name',
    label: 'Nom du bailleur',
    type: 'text',
    placeholder: 'SCI ou nom',
  },
  landlord_address: {
    key: 'landlord_address',
    label: 'Adresse bailleur',
    type: 'text',
  },
  rent_amount: {
    key: 'rent_amount',
    label: 'Loyer (€/mois)',
    type: 'number',
    placeholder: '850',
  },
  lease_start_date: {
    key: 'lease_start_date',
    label: 'Début du bail',
    type: 'date',
  },
  bank_name: {
    key: 'bank_name',
    label: 'Banque',
    type: 'text',
    placeholder: 'BNP Paribas',
  },
  iban: {
    key: 'iban',
    label: 'IBAN',
    type: 'password',
    placeholder: 'FR76 ••••',
  },
  social_security_number: {
    key: 'social_security_number',
    label: 'N° de sécurité sociale',
    type: 'password',
    placeholder: '• 15 chiffres',
  },
  tax_number: {
    key: 'tax_number',
    label: 'N° fiscal',
    type: 'password',
    placeholder: '• 13 chiffres',
  },
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<ProfileState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [openSection, setOpenSection] = useState<string | null>('identite')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial load
  useEffect(() => {
    let active = true
    fetch('/api/profile', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('load')
        return (await r.json()) as { profile: ProfileState }
      })
      .then((data) => {
        if (!active) return
        setProfile(data.profile ?? {})
      })
      .catch(() => {
        if (active) toast.error('Impossible de charger ton profil juridique.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const completion = useMemo(() => profileCompletion(profile), [profile])
  const totalFilled = useMemo(() => {
    return PROFILE_SECTIONS.reduce(
      (acc, s) => acc + countFilled(profile, s.fields),
      0
    )
  }, [profile])

  const saveProfile = useCallback(
    async (snapshot: ProfileState) => {
      setSaving(true)
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        })
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(err?.error ?? 'Erreur inconnue')
        }
        setSavedAt(Date.now())
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Impossible d\'enregistrer le profil.'
        toast.error(msg)
      } finally {
        setSaving(false)
      }
    },
    []
  )

  const scheduleSave = useCallback(
    (next: ProfileState) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void saveProfile(next)
      }, 800)
    },
    [saveProfile]
  )

  const handleChange = useCallback(
    (key: keyof LegalProfileInput, value: string | number | boolean | null) => {
      setProfile((prev) => {
        const next = { ...prev, [key]: value }
        scheduleSave(next)
        return next
      })
    },
    [scheduleSave]
  )

  const handleBlurSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    void saveProfile(profile)
  }, [profile, saveProfile])

  const toggleReveal = useCallback((key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const renderField = (field: FieldMeta) => {
    const rawValue = profile[field.key]
    const stringValue =
      rawValue == null
        ? ''
        : typeof rawValue === 'boolean'
          ? rawValue
            ? 'true'
            : 'false'
          : String(rawValue)

    const isSensitive = ENCRYPTED_KEYS.includes(field.key)
    const isRevealed = revealed.has(field.key as string)

    if (field.type === 'select' && field.options) {
      return (
        <select
          id={field.key as string}
          value={stringValue}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => {
            const v = e.target.value
            if (field.key === 'is_tenant') {
              handleChange(field.key, v === '' ? null : v === 'true')
            } else {
              handleChange(field.key, v === '' ? null : v)
            }
          }}
          onBlur={handleBlurSave}
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
        >
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }

    const inputType =
      field.type === 'password' && !isRevealed
        ? 'password'
        : field.type === 'password'
          ? 'text'
          : field.type

    return (
      <div className="relative">
        <input
          id={field.key as string}
          type={inputType}
          value={stringValue}
          placeholder={field.placeholder}
          autoComplete="off"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value
            if (field.type === 'number') {
              handleChange(
                field.key,
                v === '' ? null : Number(v.replace(',', '.'))
              )
            } else {
              handleChange(field.key, v === '' ? null : v)
            }
          }}
          onBlur={handleBlurSave}
          className="w-full rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
        />
        {isSensitive && stringValue.length > 0 && (
          <button
            type="button"
            aria-label={isRevealed ? 'Masquer' : 'Afficher'}
            onClick={() => toggleReveal(field.key as string)}
            className="absolute inset-y-0 right-2 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--justice)]/5 hover:text-[var(--justice)]"
          >
            {isRevealed ? '🙈' : '👁'}
          </button>
        )}
      </div>
    )
  }

  const renderSection = (section: ProfileSection) => {
    const filled = countFilled(profile, section.fields)
    const total = section.fields.length
    const percent = total === 0 ? 0 : Math.round((filled / total) * 100)
    const open = openSection === section.id

    return (
      <Card padding="none" key={section.id} className="overflow-hidden">
        <button
          type="button"
          onClick={() => setOpenSection(open ? null : section.id)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-white/60"
          aria-expanded={open}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-2xl" aria-hidden="true">
              {section.icon}
            </span>
            <div className="min-w-0">
              <p className="font-serif text-lg font-semibold text-[var(--justice)]">
                {section.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {filled}/{total} champs remplis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--justice)]/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--justice)] via-[var(--justice-light)] to-[var(--gold)] transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <span
              className={`text-xl transition-transform ${
                open ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </div>
        </button>
        {open && (
          <div className="border-t border-[var(--border)] bg-white/40 px-5 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((fieldKey) => {
                const meta = FIELD_META[fieldKey]
                if (!meta) return null
                return (
                  <div key={fieldKey} className="flex flex-col gap-1.5">
                    <label
                      htmlFor={fieldKey as string}
                      className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"
                    >
                      {meta.label}
                      {ENCRYPTED_KEYS.includes(fieldKey) && (
                        <span className="ml-1 text-[9px] font-normal text-[var(--gold-dark)]">
                          🔒 chiffré
                        </span>
                      )}
                    </label>
                    {renderField(meta)}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    )
  }

  return (
    <div className="container-narrow py-8 md:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--gold-dark)]">
            Profil juridique intelligent
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold text-[var(--justice)] md:text-4xl">
            Ton profil juridique
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            JurisIA utilise ces informations pour pré-remplir automatiquement
            tes documents. Les champs sensibles sont chiffrés AES-256.
          </p>
        </div>
        <div
          aria-live="polite"
          className="flex h-9 min-w-[96px] items-center justify-center rounded-full border border-[var(--border)] bg-white/70 px-3 text-xs font-medium text-[var(--text-secondary)]"
        >
          {saving ? (
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--justice)]" />
              Enregistrement…
            </span>
          ) : savedAt ? (
            <span className="text-emerald-700">✓ Enregistré</span>
          ) : (
            <span>Auto-save</span>
          )}
        </div>
      </header>

      {/* Circular progress */}
      <Card padding="lg" className="mb-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <CircularProgress value={completion} />
          <div className="flex-1 text-center sm:text-left">
            <p className="font-serif text-2xl font-semibold text-[var(--justice)]">
              Profil complété à {completion}%
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              {totalFilled} champ{totalFilled > 1 ? 's' : ''} sur {totalFields()}
              . Plus ton profil est complet, mieux JurisIA pré-remplit tes
              documents juridiques.
            </p>
            {completion < 40 && (
              <p className="mt-2 rounded-lg bg-[var(--gold)]/10 px-3 py-1.5 text-xs text-[var(--gold-dark)]">
                💡 Astuce : remplis d&apos;abord l&apos;identité et l&apos;adresse, le reste
                se complète au fil des dossiers.
              </p>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3">
          {PROFILE_SECTIONS.map((s) => (
            <div
              key={s.id}
              className="h-16 animate-pulse rounded-2xl bg-white/60"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {PROFILE_SECTIONS.map((section) => renderSection(section))}
        </div>
      )}
    </div>
  )
}

function CircularProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference
  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="8"
          fill="none"
          className="stroke-[var(--justice)]/10"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          strokeWidth="8"
          fill="none"
          stroke="url(#profile-gradient)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="profile-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A5F" />
            <stop offset="100%" stopColor="#C9A84C" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-2xl font-bold text-[var(--justice)]">
          {clamped}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          Complété
        </span>
      </div>
    </div>
  )
}
