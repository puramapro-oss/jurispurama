'use client'

import Button from '@/components/ui/Button'

interface TeleserviceLink {
  label: string
  url: string
  description: string
  copy: string[]
}

interface TeleserviceListProps {
  teleservices: TeleserviceLink[]
}

export default function TeleserviceList({ teleservices }: TeleserviceListProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--text-secondary)]">
        Les téléservices officiels acceptent le dépôt direct en ligne.
        Ouvre le portail concerné, puis copie-colle les champs
        ci-dessous depuis ton document.
      </p>
      <ul className="space-y-3">
        {teleservices.map((t) => (
          <li
            key={t.url}
            className="rounded-xl border border-[var(--border)] bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--justice)]">
                  {t.label}
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  {t.description}
                </p>
              </div>
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Button variant="secondary" size="sm">
                  Ouvrir
                </Button>
              </a>
            </div>
            <div className="mt-3 rounded-lg bg-[var(--bg-nebula)] p-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                À copier depuis le PDF :
              </p>
              <ul className="mt-1 list-disc pl-4 text-xs text-[var(--text-secondary)]">
                {t.copy.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--text-muted)]">
        Pense à télécharger le PDF signé avant d&apos;aller sur le
        téléservice.
      </p>
    </div>
  )
}
