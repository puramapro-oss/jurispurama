'use client'

interface StatusBannersProps {
  isSigned: boolean
  sentStatus: 'not_sent' | 'sent_email' | 'sent_recommande' | 'sent_teleservice'
  trackingNumber: string | null
  sentTo: string | null
  arReceivedAt: string | null
}

export default function StatusBanners({
  isSigned,
  sentStatus,
  trackingNumber,
  sentTo,
  arReceivedAt,
}: StatusBannersProps) {
  return (
    <>
      {isSigned && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-800">
          <span aria-hidden="true" className="text-xl">
            ✓
          </span>
          <div className="min-w-0">
            <p className="font-semibold">Document signé électroniquement</p>
            <p className="text-xs opacity-80">
              Valeur juridique équivalente à une signature manuscrite (Art.
              1366 du Code civil).
            </p>
          </div>
        </div>
      )}

      {sentStatus === 'sent_recommande' && (
        <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/70 px-4 py-3 text-sm text-violet-800">
          <p className="font-semibold">📮 Recommandé AR en cours</p>
          <p className="mt-0.5 text-xs">
            Numéro de suivi :{' '}
            <span className="font-mono">{trackingNumber}</span>
            {sentTo && <> — Destinataire : {sentTo}</>}
          </p>
          {arReceivedAt ? (
            <p className="mt-1 text-xs font-semibold text-emerald-700">
              ✓ Accusé de réception reçu le{' '}
              {new Date(arReceivedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          ) : (
            <p className="mt-1 text-xs opacity-80">
              En attente de l&apos;accusé de réception (suivi automatique toutes
              les 6 h).
            </p>
          )}
        </div>
      )}
    </>
  )
}
