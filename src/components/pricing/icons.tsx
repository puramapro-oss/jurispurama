// Pricing table icons

export function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[var(--gold)]"
      aria-label="Inclus"
    >
      <path d="M5 12l5 5L20 7" />
    </svg>
  )
}

export function CrossIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="text-white/30"
      aria-label="Non inclus"
    >
      <path d="M6 6l12 12" />
      <path d="M6 18L18 6" />
    </svg>
  )
}
