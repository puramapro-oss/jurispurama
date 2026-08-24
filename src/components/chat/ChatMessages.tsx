'use client'

import MessageBubble from '@/components/chat/MessageBubble'
import ActionButtons, { type NextAction } from '@/components/chat/ActionButtons'

interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt?: string
  streaming?: boolean
  actions?: string[] | null
}

interface ChatMessagesProps {
  messages: UIMessage[]
  loading: boolean
  streaming: boolean
  errored: string | null
  showWelcome: boolean
  emptyStateShown: boolean
  lastAssistantIdx: number
  onAction: (action: NextAction) => void
}

export default function ChatMessages({
  messages,
  loading,
  streaming,
  errored,
  showWelcome,
  emptyStateShown,
  lastAssistantIdx,
  onAction,
}: ChatMessagesProps) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)]">
        Chargement du dossier…
      </div>
    )
  }

  if (showWelcome) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--justice)] to-[var(--justice-light)] text-3xl text-white shadow-lg">
          ⚖️
        </div>
        <h2 className="mb-2 font-serif text-2xl font-semibold text-[var(--justice)]">
          Bonjour, je suis JurisIA
        </h2>
        <p className="max-w-md text-sm text-[var(--text-secondary)]">
          Raconte-moi ta situation dans le champ ci-dessous. Je t&apos;aide à
          comprendre tes droits et je construis ton dossier pas à pas.
        </p>
      </div>
    )
  }

  if (emptyStateShown) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Ce dossier est vide. Pose ta première question à JurisIA ci-dessous.
        </p>
      </div>
    )
  }

  return (
    <>
      {messages.map((m, idx) => (
        <MessageBubble
          key={m.id}
          role={m.role}
          content={m.content}
          createdAt={m.createdAt}
          streaming={m.streaming}
        >
          {idx === lastAssistantIdx && m.role === 'assistant' && (
            <ActionButtons actions={m.actions} onAction={onAction} />
          )}
        </MessageBubble>
      ))}

      {errored && !streaming && messages.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠️ {errored}
        </div>
      )}
    </>
  )
}
