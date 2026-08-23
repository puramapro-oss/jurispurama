'use client'

import Card from '@/components/ui/Card'
import type { LegalProfileInput, ProfileSection as ProfileSectionType } from '@/lib/profile-schema'
import { ENCRYPTED_FIELDS, countFilled } from '@/lib/profile-schema'
import { FIELD_META } from '@/lib/profile-fields'
import ProfileField from './ProfileField'

interface ProfileSectionProps {
  section: ProfileSectionType
  profile: Partial<LegalProfileInput>
  revealed: Set<string>
  open: boolean
  onToggleSection: (sectionId: string) => void
  onChange: (key: keyof LegalProfileInput, value: string | number | boolean | null) => void
  onBlur: () => void
  onToggleReveal: (key: string) => void
}

export default function ProfileSection({
  section,
  profile,
  revealed,
  open,
  onToggleSection,
  onChange,
  onBlur,
  onToggleReveal,
}: ProfileSectionProps) {
  const filled = countFilled(profile, section.fields)
  const total = section.fields.length
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100)

  return (
    <Card padding="none" key={section.id} className="overflow-hidden">
      <button
        type="button"
        onClick={() => onToggleSection(section.id)}
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
                    {ENCRYPTED_FIELDS.includes(fieldKey as (typeof ENCRYPTED_FIELDS)[number]) && (
                      <span className="ml-1 text-[9px] font-normal text-[var(--gold-dark)]">
                        🔒 chiffré
                      </span>
                    )}
                  </label>
                  <ProfileField
                    field={meta}
                    value={profile[fieldKey]}
                    revealed={revealed.has(fieldKey as string)}
                    onChange={onChange}
                    onBlur={onBlur}
                    onToggleReveal={onToggleReveal}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
