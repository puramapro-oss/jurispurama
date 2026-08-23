import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

interface Template {
  title: string
  text: string
}

interface PublicationTemplatesProps {
  templates: Template[]
  goLink: string
  onCopy: (text: string) => void
}

export default function PublicationTemplates({
  templates,
  goLink,
  onCopy,
}: PublicationTemplatesProps) {
  return (
    <Card padding="lg" className="mt-6">
      <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
        Templates de publication
      </h2>
      <div className="space-y-3">
        {templates.map((t) => {
          const fullText = t.text + goLink
          return (
            <div
              key={t.title}
              className="rounded-xl border border-[var(--border)] bg-white/60 p-4"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--gold-dark)]">
                {t.title}
              </p>
              <p className="text-sm text-[var(--text-primary)]">{fullText}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => onCopy(fullText)}
              >
                📋 Copier le texte
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
