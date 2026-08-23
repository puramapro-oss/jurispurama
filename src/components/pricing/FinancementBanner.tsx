import Link from 'next/link'

// Banner promoting financial aid
export default function FinancementBanner() {
  return (
    <div className="bg-emerald-600/90 backdrop-blur-md">
      <div className="container-wide flex items-center justify-center gap-3 py-3 text-center text-sm font-medium text-white">
        <span>🏛️</span>
        <span>
          La plupart de nos clients ne paient rien grâce aux aides
          juridiques.
        </span>
        <Link
          href="/financer"
          className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition"
        >
          Découvrir &rarr;
        </Link>
      </div>
    </div>
  )
}
