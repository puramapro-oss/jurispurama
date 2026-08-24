'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ChatInput from '@/components/chat/ChatInput'
import CaseSidebar from '@/components/chat/CaseSidebar'
import PhaseStepper from '@/components/chat/PhaseStepper'
import GenerateDocumentModal from '@/components/chat/GenerateDocumentModal'
import ChatMessages from '@/components/chat/ChatMessages'
import AIDisclosure from '@/lib/legal/components/AIDisclosure'
import type { CaseSidebarAction } from '@/components/chat/CaseSidebar'
import type { NextAction } from '@/components/chat/ActionButtons'
import { useChatMessages } from '@/hooks/useChatMessages'
import { useChatActions } from '@/hooks/useChatActions'
import { useScrollManagement } from '@/hooks/useScrollManagement'
import { APP_NAME } from '@/lib/constants'

export default function ChatCasePage() {
  const params = useParams<{ caseId: string }>()
  const initialCaseId = params.caseId

  const { scrollRef, scrollToBottom, handleScroll } =
    useScrollManagement([])

  const {
    caseId,
    caseRow,
    setCaseRow,
    documents,
    setDocuments,
    messages,
    setMessages,
    loading,
    streaming,
    errored,
    sendMessage,
  } = useChatMessages(initialCaseId, scrollToBottom)

  const [input, setInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const pendingSentRef = useRef(false)

  const { handleAction: baseHandleAction, handleScanFile, handleGenerateDocument } =
    useChatActions({
      caseId,
      documents,
      setCaseRow,
      setDocuments,
      setMessages,
      scrollToBottom,
    })

  // Auto-send pending message from /chat page
  useEffect(() => {
    if (initialCaseId !== 'new') return
    if (pendingSentRef.current) return
    try {
      const raw = sessionStorage.getItem('jurispurama:pending_message')
      if (!raw) return
      sessionStorage.removeItem('jurispurama:pending_message')
      const parsed = JSON.parse(raw) as { message: string; ts: number }
      if (!parsed?.message) return
      pendingSentRef.current = true
      void sendMessage(parsed.message)
    } catch {
      // noop
    }
  }, [initialCaseId, sendMessage])

  const handleSubmit = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    void sendMessage(text)
  }

  const handleAction = useCallback(
    (action: NextAction) => {
      baseHandleAction(action, setDocModalOpen)
    },
    [baseHandleAction]
  )

  const handleSidebarAction = useCallback(
    (action: CaseSidebarAction) => {
      if (action === 'view_full' || action === 'new_case') return
      handleAction(action as NextAction)
    },
    [handleAction]
  )

  const onScanFile = useCallback(
    async (file: File) => {
      setScanning(true)
      try {
        await handleScanFile(file)
      } finally {
        setScanning(false)
      }
    },
    [handleScanFile]
  )

  const onGenerateDocument = useCallback(
    async (payload: {
      documentType: string
      title: string
      instructions: string
    }) => {
      setGenerating(true)
      try {
        await handleGenerateDocument(payload as Parameters<typeof handleGenerateDocument>[0])
        setDocModalOpen(false)
      } finally {
        setGenerating(false)
      }
    },
    [handleGenerateDocument]
  )

  const currentStatus = caseRow?.status ?? 'diagnostic'
  const emptyStateShown =
    !loading && messages.length === 0 && initialCaseId !== 'new'
  const showWelcome =
    initialCaseId === 'new' && messages.length === 0 && !streaming
  const hasMessages = messages.length > 0

  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && !messages[i].streaming) return i
    }
    return -1
  }, [messages])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:py-6 lg:flex-row lg:h-[calc(100dvh-3rem)] h-[calc(100dvh-3.5rem-5.5rem)] lg:py-4">
      <div className="flex min-h-0 flex-1 flex-col">
        <PhaseStepper current={currentStatus} className="mb-3" />
        <AIDisclosure
          appName={APP_NAME}
          className="mb-3 text-xs text-[var(--text-muted)]"
        />

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 space-y-4 overflow-y-auto rounded-2xl border border-[var(--border)] bg-white/40 p-4 backdrop-blur"
        >
          <ChatMessages
            messages={messages}
            loading={loading}
            streaming={streaming}
            errored={errored}
            showWelcome={showWelcome}
            emptyStateShown={emptyStateShown}
            lastAssistantIdx={lastAssistantIdx}
            onAction={handleAction}
          />
        </div>

        <div className="mt-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            disabled={streaming}
            placeholder={
              hasMessages
                ? 'Pose ta question suivante…'
                : 'Raconte ton problème juridique à JurisIA…'
            }
            onScan={caseId ? onScanFile : undefined}
            scanning={scanning}
          />
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>
              🔒 Confidentiel · protégé par le secret juridique numérique
            </span>
            {caseRow?.id && (
              <Link
                href={`/dossiers/${caseRow.id}`}
                className="font-semibold text-[var(--justice)] hover:underline"
              >
                Voir le dossier →
              </Link>
            )}
          </div>
        </div>
      </div>

      <CaseSidebar caseRow={caseRow} onActionClick={handleSidebarAction} />

      <GenerateDocumentModal
        open={docModalOpen}
        caseType={caseRow?.type ?? 'administratif'}
        defaultTitle={
          caseRow?.summary ? caseRow.summary.slice(0, 60) : undefined
        }
        onClose={() => setDocModalOpen(false)}
        onGenerate={onGenerateDocument}
        loading={generating}
      />
    </div>
  )
}
