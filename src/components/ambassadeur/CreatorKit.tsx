import Image from 'next/image'
import Card from '@/components/ui/Card'

interface Banner {
  title: string
  url: string
}

interface CreatorKitProps {
  banners: Banner[]
}

export default function CreatorKit({ banners }: CreatorKitProps) {
  return (
    <Card padding="lg" className="mt-6">
      <h2 className="mb-3 font-serif text-xl font-semibold text-[var(--justice)]">
        Kit créateur
      </h2>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Bannières prêtes à utiliser, générées par Pollinations. Clic droit →
        enregistrer l&apos;image.
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {banners.map((b) => (
          <a
            key={b.title}
            href={b.url}
            target="_blank"
            rel="noreferrer"
            className="group overflow-hidden rounded-xl border border-[var(--border)] bg-white transition hover:border-[var(--justice)]"
          >
            <Image
              src={b.url}
              alt={b.title}
              width={400}
              height={200}
              loading="lazy"
              className="h-32 w-full object-cover transition group-hover:scale-[1.02]"
            />
            <p className="px-3 py-2 text-xs font-medium text-[var(--text-secondary)]">
              {b.title}
            </p>
          </a>
        ))}
      </div>
    </Card>
  )
}
