import { LEGAL_DOMAINS } from '@/lib/constants'

export default function LegalDomainsGrid() {
  return (
    <section>
      <h2 className="mb-4 font-serif text-2xl font-semibold text-[var(--justice)]">
        Les 12 domaines du droit couverts
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {LEGAL_DOMAINS.map((d) => (
          <div
            key={d.id}
            className="glass flex items-center gap-3 rounded-xl p-4"
          >
            <span className="text-2xl" aria-hidden="true">
              {d.icon}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
