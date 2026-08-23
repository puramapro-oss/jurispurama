'use client'

import { useMemo, useState } from 'react'
import {
  FAQ_ARTICLES,
  searchFaq,
  type FaqArticle,
  type FaqCategory,
} from '@/lib/faq'
import HeroSection from '@/components/aide/HeroSection'
import CategoryTabs from '@/components/aide/CategoryTabs'
import FAQList from '@/components/aide/FAQList'
import HelpCTAs from '@/components/aide/HelpCTAs'
import ChatModal from '@/components/aide/ChatModal'

export default function AideClient() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<FaqCategory | 'all'>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  const filtered: FaqArticle[] = useMemo(() => {
    const base = query.trim() ? searchFaq(query) : FAQ_ARTICLES
    if (category === 'all') return base
    return base.filter((a) => a.category === category)
  }, [query, category])

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    setOpenId(null)
  }

  return (
    <>
      <HeroSection query={query} onQueryChange={handleQueryChange} />
      <CategoryTabs category={category} onChange={setCategory} />
      <FAQList
        articles={filtered}
        openId={openId}
        onToggle={setOpenId}
        onChatOpen={() => setChatOpen(true)}
      />
      <HelpCTAs onChatOpen={() => setChatOpen(true)} />
      {chatOpen && <ChatModal onClose={() => setChatOpen(false)} />}
    </>
  )
}
