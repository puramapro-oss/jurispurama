'use client'

interface Step {
  n: string
  title: string
  description: string
  visual: 'chat' | 'analyse' | 'doc' | 'signature' | 'envoi' | 'suivi'
}

export default function StepVisual({ visual }: { visual: Step['visual'] }) {
  if (visual === 'chat') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
          <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
          JurisIA
        </div>
        <div className="mb-2 ml-auto max-w-[82%] rounded-2xl rounded-tr-sm bg-[var(--justice-light)]/40 px-4 py-2.5 text-sm text-white">
          J&apos;ai reçu une amende de stationnement hier...
        </div>
        <div className="mt-3 flex items-start gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--gold)] text-xs">
            ⚖️
          </div>
          <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/85">
            Je regarde tout de suite. Tu peux me dire le montant et le motif sur le
            PV ?
          </div>
        </div>
      </div>
    )
  }
  if (visual === 'analyse') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          Analyse juridique
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-white/70">Domaine</span>
            <span className="font-semibold text-white">Code de la route</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <span className="text-white/70">Article applicable</span>
            <span className="font-semibold text-[var(--gold-light)]">R417-10</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--gold)]/30 bg-[var(--gold)]/5 px-3 py-2">
            <span className="text-white/70">Chances de succès</span>
            <span className="font-semibold text-[var(--gold-light)]">78 %</span>
          </div>
        </div>
      </div>
    )
  }
  if (visual === 'suivi') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          Plan d&apos;action
        </div>
        <ol className="space-y-2.5 text-sm text-white/80">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-light)]">
              1
            </span>
            <span>Photographier le panneau (45 j max)</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-light)]">
              2
            </span>
            <span>Requête en exonération ANTAI</span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--gold)]/20 text-xs font-bold text-[var(--gold-light)]">
              3
            </span>
            <span>Joindre preuves photographiques</span>
          </li>
        </ol>
      </div>
    )
  }
  if (visual === 'doc') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[var(--gold)]">
            📄
          </div>
          <div className="text-sm font-semibold text-white">
            Contestation-amende.pdf
          </div>
        </div>
        <div className="space-y-1.5 rounded-lg bg-black/30 p-3 text-xs text-white/60">
          <div className="h-1.5 w-3/4 rounded bg-white/15" />
          <div className="h-1.5 w-full rounded bg-white/12" />
          <div className="h-1.5 w-5/6 rounded bg-white/10" />
          <div className="h-1.5 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-1.5 w-1/2 rounded bg-[var(--gold)]/40" />
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wider text-white/40">
          Article R417-10 · Code de la route
        </div>
      </div>
    )
  }
  if (visual === 'signature') {
    return (
      <div className="glass-dark rounded-2xl p-5">
        <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
          Signature électronique
        </div>
        <div className="flex h-20 items-end justify-center rounded-xl border border-[var(--gold)]/30 bg-white/5 p-3">
          <svg
            viewBox="0 0 200 40"
            className="h-full w-full"
            aria-hidden="true"
          >
            <path
              d="M10,30 Q 30,5 50,20 T 100,25 Q 130,30 150,10 T 190,22"
              stroke="#C9A84C"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-wider text-white/45">
          Art. 1366 CC · SHA-256 vérifié
        </div>
      </div>
    )
  }
  // envoi
  return (
    <div className="glass-dark rounded-2xl p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--gold)]">
        Envoi en cours
      </div>
      <div className="space-y-2">
        {[
          { label: 'Document généré', done: true },
          { label: 'Signature horodatée', done: true },
          { label: 'Envoi AR24 confirmé', done: true },
          { label: 'Accusé de réception', done: false },
        ].map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                s.done
                  ? 'bg-[var(--gold)] text-[var(--justice-dark)]'
                  : 'border border-white/30 text-white/40'
              }`}
            >
              {s.done ? '✓' : '·'}
            </span>
            <span className={s.done ? 'text-white' : 'text-white/50'}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
