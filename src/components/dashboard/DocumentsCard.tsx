import Link from 'next/link'
import Card from '@/components/ui/Card'

interface DocumentsCardProps {
  docsCount: number | null
}

export default function DocumentsCard({ docsCount }: DocumentsCardProps) {
  return (
    <Link href="/documents" className="block">
      <Card
        padding="md"
        className="h-full transition-all hover:border-[var(--justice)]/30 hover:shadow-md"
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Documents générés
            </p>
            <p className="mt-1 font-serif text-2xl font-bold text-[var(--justice)]">
              {docsCount == null ? '…' : docsCount}
            </p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {docsCount === 0
                ? "Aucun document pour l'instant."
                : 'Accède à tous tes actes signables en un clic.'}
            </p>
          </div>
          <span className="text-4xl" aria-hidden="true">
            📄
          </span>
        </div>
      </Card>
    </Link>
  )
}
