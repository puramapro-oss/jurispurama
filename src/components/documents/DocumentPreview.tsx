'use client'

import Card from '@/components/ui/Card'

interface DocumentPreviewProps {
  previewUrl: string | null
  title: string
}

export default function DocumentPreview({ previewUrl, title }: DocumentPreviewProps) {
  return (
    <Card padding="sm" className="overflow-hidden">
      {previewUrl ? (
        <iframe
          src={previewUrl}
          className="h-[70vh] min-h-[520px] w-full rounded-xl border border-[var(--border)]"
          title={title}
        />
      ) : (
        <div className="flex h-[520px] items-center justify-center text-sm text-[var(--text-muted)]">
          Aperçu indisponible.
        </div>
      )}
    </Card>
  )
}
