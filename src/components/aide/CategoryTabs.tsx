'use client'

import { FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq'
import Reveal from '@/components/landing/Reveal'

interface CategoryTabsProps {
  category: FaqCategory | 'all'
  onChange: (category: FaqCategory | 'all') => void
}

export default function CategoryTabs({ category, onChange }: CategoryTabsProps) {
  return (
    <section className="relative py-6">
      <div className="container-wide">
        <Reveal className="mx-auto max-w-5xl">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => onChange('all')}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                category === 'all'
                  ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10 text-[var(--gold-light)]'
                  : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
              }`}
            >
              <span>📚</span>
              <span>Toutes</span>
            </button>
            {FAQ_CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onChange(c.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === c.id
                    ? 'border-[var(--gold)]/50 bg-[var(--gold)]/10 text-[var(--gold-light)]'
                    : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
