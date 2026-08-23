import Image from 'next/image'
import Card from '@/components/ui/Card'

interface ReferralQRCardProps {
  qrUrl: string | null
}

export default function ReferralQRCard({ qrUrl }: ReferralQRCardProps) {
  return (
    <Card padding="lg" className="flex flex-col items-center">
      <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
        QR Code
      </p>
      {qrUrl ? (
        <Image
          src={qrUrl}
          alt="QR Code de ton lien de parrainage"
          width={192}
          height={192}
          className="mt-3"
        />
      ) : (
        <div className="mt-3 flex h-48 w-48 items-center justify-center rounded-xl bg-[var(--parchment)] text-xs text-[var(--text-muted)]">
          Génération…
        </div>
      )}
      <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
        Imprime-le, colle-le partout
      </p>
    </Card>
  )
}
