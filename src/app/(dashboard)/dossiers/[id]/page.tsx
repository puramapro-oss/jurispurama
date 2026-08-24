'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Tabs, { type TabItem } from '@/components/ui/Tabs'
import PhaseStepper from '@/components/chat/PhaseStepper'
import CaseHeader from '@/components/dossiers/CaseHeader'
import CaseStats from '@/components/dossiers/CaseStats'
import CaseTabContent from '@/components/dossiers/CaseTabContent'
import type { JurisCase, JurisDocument, JurisMessage } from '@/types'
import { buildTimeline } from '@/lib/case-helpers'

type TabId = 'timeline' | 'documents' | 'deadlines' | 'savings' | 'messages'

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const caseId = params.id

  const [caseRow, setCaseRow] = useState<JurisCase | null>(null)
  const [messages, setMessages] = useState<JurisMessage[]>([])
  const [documents, setDocuments] = useState<JurisDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('timeline')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/cases/${caseId}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 404) {
            toast.error('Dossier introuvable.')
            router.replace('/dossiers')
            return null
          }
          throw new Error('Impossible de charger ce dossier.')
        }
        return r.json() as Promise<{
          case: JurisCase
          messages: JurisMessage[]
          documents: JurisDocument[]
        }>
      })
      .then((data) => {
        if (!active || !data) return
        setCaseRow(data.case)
        setMessages(data.messages)
        setDocuments(data.documents)
      })
      .catch(() => {
        if (active) toast.error('Impossible de charger ce dossier.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [caseId, router])

  const handleArchive = useCallback(async () => {
    if (!confirm('Archiver ce dossier ? Il sera marqué comme résolu.')) return
    setDeleting(true)
    const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      toast.success('Dossier archivé.')
      router.push('/dossiers')
    } else {
      toast.error('Impossible d&apos;archiver le dossier.')
    }
  }, [caseId, router])

  if (loading) {
    return (
      <div className="container-narrow py-10">
        <div className="h-64 animate-pulse rounded-2xl bg-white/60" />
      </div>
    )
  }

  if (!caseRow) return null

  const deadlines = caseRow.deadlines ?? []
  const timeline = buildTimeline(caseRow, messages, documents)
  const nextDeadline = deadlines.length > 0 ? deadlines[0] : null

  const tabItems: TabItem[] = [
    { id: 'timeline', label: 'Timeline', icon: '📍' },
    { id: 'messages', label: 'Échanges', icon: '💬', count: messages.length },
    {
      id: 'documents',
      label: 'Documents',
      icon: '📄',
      count: documents.length,
    },
    {
      id: 'deadlines',
      label: 'Délais',
      icon: '⏰',
      count: deadlines.length,
    },
    { id: 'savings', label: 'Gains', icon: '💰' },
  ]

  return (
    <div className="container-narrow py-6 md:py-10">
      <CaseHeader
        caseRow={caseRow}
        deleting={deleting}
        onArchive={handleArchive}
      />

      <PhaseStepper current={caseRow.status} className="mb-4" />

      <CaseStats caseRow={caseRow} nextDeadline={nextDeadline} />

      <Tabs
        items={tabItems}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        className="mb-4"
      />

      <CaseTabContent
        tab={tab}
        caseRow={caseRow}
        messages={messages}
        documents={documents}
        timeline={timeline}
        deadlines={deadlines}
        onCaseUpdate={setCaseRow}
      />
    </div>
  )
}
