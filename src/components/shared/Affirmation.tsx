'use client'

import { useEffect, useState } from 'react'

export default function Affirmation() {
  const [text, setText] = useState('')

  useEffect(() => {
    fetch('/api/affirmation')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.affirmation?.text_fr) setText(d.affirmation.text_fr)
      })
      .catch(() => {})
  }, [])

  if (!text) return null

  return (
    <div className="rounded-2xl border border-[var(--gold)]/20 bg-gradient-to-r from-[var(--gold)]/5 to-transparent px-5 py-3">
      <p className="text-center font-serif text-sm italic text-[var(--gold-dark)]">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  )
}
