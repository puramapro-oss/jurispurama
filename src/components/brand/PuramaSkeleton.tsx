interface Props {
  className?: string
  count?: number
}

/**
 * PuramaSkeleton — shimmer loading placeholder (V7.1 §12)
 */
export function PuramaSkeleton({ className = 'h-4 w-full', count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-lg bg-black/5 ${className}`}
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.6s_infinite]" />
        </div>
      ))}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </>
  )
}

export default PuramaSkeleton
