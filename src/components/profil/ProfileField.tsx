'use client'

import type { ChangeEvent } from 'react'
import type { LegalProfileInput } from '@/lib/profile-schema'
import { ENCRYPTED_FIELDS } from '@/lib/profile-schema'
import type { FieldMeta } from '@/lib/profile-fields'

interface ProfileFieldProps {
  field: FieldMeta
  value: string | number | boolean | null | undefined
  revealed: boolean
  onChange: (key: keyof LegalProfileInput, value: string | number | boolean | null) => void
  onBlur: () => void
  onToggleReveal: (key: string) => void
}

export default function ProfileField({
  field,
  value: rawValue,
  revealed,
  onChange,
  onBlur,
  onToggleReveal,
}: ProfileFieldProps) {
  const stringValue =
    rawValue == null
      ? ''
      : typeof rawValue === 'boolean'
        ? rawValue
          ? 'true'
          : 'false'
        : String(rawValue)

  const isSensitive = ENCRYPTED_FIELDS.includes(field.key as (typeof ENCRYPTED_FIELDS)[number])
  const isRevealed = revealed

  if (field.type === 'select' && field.options) {
    return (
      <select
        id={field.key as string}
        value={stringValue}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          const v = e.target.value
          if (field.key === 'is_tenant') {
            onChange(field.key, v === '' ? null : v === 'true')
          } else {
            onChange(field.key, v === '' ? null : v)
          }
        }}
        onBlur={onBlur}
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
            onChange(
              field.key,
              v === '' ? null : Number(v.replace(',', '.'))
            )
          } else {
            onChange(field.key, v === '' ? null : v)
          }
        }}
        onBlur={onBlur}
        className="w-full rounded-xl border border-[var(--border-strong)] bg-white/90 px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--justice)] focus:ring-2 focus:ring-[var(--justice)]/20"
      />
      {isSensitive && stringValue.length > 0 && (
        <button
          type="button"
          aria-label={isRevealed ? 'Masquer' : 'Afficher'}
          onClick={() => onToggleReveal(field.key as string)}
          className="absolute inset-y-0 right-2 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--justice)]/5 hover:text-[var(--justice)]"
        >
          {isRevealed ? '🙈' : '👁'}
        </button>
      )}
    </div>
  )
}
