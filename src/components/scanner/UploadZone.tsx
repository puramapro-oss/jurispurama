'use client'

import { useRef, type ChangeEvent, type DragEvent } from 'react'
import Button from '@/components/ui/Button'

interface UploadZoneProps {
  file: File | null
  previewUrl: string | null
  dragActive: boolean
  analyzing: boolean
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onFileInput: (e: ChangeEvent<HTMLInputElement>) => void
  onAnalyze: () => void
  onReset: () => void
  context: string
  setContext: (val: string) => void
}

export default function UploadZone({
  file,
  previewUrl,
  dragActive,
  analyzing,
  onDrop,
  onDragOver,
  onDragLeave,
  onFileInput,
  onAnalyze,
  onReset,
  context,
  setContext,
}: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`relative flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
        dragActive
          ? 'border-[var(--justice)] bg-[var(--justice)]/5'
          : 'border-[var(--border-strong)] bg-white/30'
      }`}
    >
      {file ? (
        <div className="flex w-full flex-col items-center gap-4">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={file.name}
              className="max-h-64 rounded-xl border border-[var(--border)] object-contain shadow-md"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--justice)]/10 text-4xl">
              📄
            </div>
          )}
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              {file.name}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {(file.size / 1024).toFixed(1)} Ko · {file.type}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
            >
              Changer de fichier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={analyzing}
            >
              Annuler
            </Button>
          </div>
          <div className="w-full">
            <label
              htmlFor="context"
              className="mb-1 block text-left text-xs font-medium text-[var(--text-secondary)]"
            >
              Contexte additionnel (optionnel)
            </label>
            <textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Ex: Je conteste une amende, ce PV contient une erreur…"
              rows={2}
              disabled={analyzing}
              className="w-full rounded-xl border border-[var(--border)] bg-white/60 px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--justice)] focus:outline-none disabled:opacity-60"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={onAnalyze}
            loading={analyzing}
            className="w-full"
          >
            {analyzing ? 'Analyse en cours…' : 'Analyser ce document'}
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--justice)]/10 text-4xl">
            📸
          </div>
          <p className="mb-2 font-semibold text-[var(--text-primary)]">
            Glisse ton document ici
          </p>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            ou clique pour sélectionner (JPEG, PNG, WEBP, GIF, PDF, max 10 Mo)
          </p>
          <Button
            variant="secondary"
            size="md"
            onClick={() => fileInputRef.current?.click()}
          >
            Choisir un fichier
          </Button>
        </>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
        className="hidden"
        onChange={onFileInput}
      />
    </div>
  )
}
