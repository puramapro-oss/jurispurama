'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from 'sonner'
import Card from '@/components/ui/Card'
import {
  PROFILE_SECTIONS,
  profileCompletion,
  totalFields,
  countFilled,
  type LegalProfileInput,
} from '@/lib/profile-schema'
import CircularProgress from '@/components/profil/CircularProgress'
import ProfileSection from '@/components/profil/ProfileSection'

type ProfileState = Partial<LegalProfileInput>

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

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSection((prev) => (prev === sectionId ? null : sectionId))
  }, [])

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
          {PROFILE_SECTIONS.map((section) => (
            <ProfileSection
              key={section.id}
              section={section}
              profile={profile}
              revealed={revealed}
              open={openSection === section.id}
              onToggleSection={toggleSection}
              onChange={handleChange}
              onBlur={handleBlurSave}
              onToggleReveal={toggleReveal}
            />
          ))}
        </div>
      )}
    </div>
  )
}
