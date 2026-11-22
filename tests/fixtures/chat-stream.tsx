import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import ChatInput from '../../src/components/chat/ChatInput'
import { useChatMessages } from '../../src/hooks/useChatMessages'
import { usePendingChatMessage } from '../../src/hooks/usePendingChatMessage'

export interface ChatRequest {
  url: string
  options: RequestInit
  resolve: (response: Response) => void
  reject: (reason: Error) => void
}

declare global {
  interface Window {
    chatRequests: ChatRequest[]
    chatCurrent: ReturnType<typeof useChatMessages> | null
    chatStreamControllers: Record<number, ReadableStreamDefaultController<Uint8Array>>
    chatCancellations: Record<number, number>
    chatJSONReleases: Record<number, (value: unknown) => void>
    chatInitialCase: string
  }
}

function Conversation({ initialCaseId }: { initialCaseId: string }) {
  const scroll = useCallback(() => undefined, [])
  const chat = useChatMessages(initialCaseId, scroll)
  const [input, setInput] = useState('Question de test')
  usePendingChatMessage(initialCaseId, chat.sendMessage)
  useEffect(() => {
    window.chatCurrent = chat
    return () => { window.chatCurrent = null }
  }, [chat])
  return <section aria-label="Conversation de test">
    <p data-testid="case-id">{chat.caseId ?? 'new'}</p>
    <p data-testid="case-summary">{chat.caseRow?.summary ?? ''}</p>
    <p data-testid="loading">{chat.loading ? 'Chargement' : 'Prêt'}</p>
    <p data-testid="streaming">{chat.streaming ? 'Réponse en cours' : 'Réponse terminée'}</p>
    <ol>{chat.messages.map(message => <li key={message.id}>
      <span>{message.content}</span>
      {message.streaming && <span>Écriture en cours</span>}
      {message.actions?.map(action => <span key={action}>{action}</span>)}
    </li>)}</ol>
    {chat.errored && <p role="alert">{chat.errored}</p>}
    <ChatInput value={input} onChange={setInput} disabled={chat.streaming || chat.loading} onSubmit={() => {
      if (chat.loading || chat.streaming || !input.trim()) return
      const text = input.trim()
      setInput('')
      void chat.sendMessage(text)
    }} />
  </section>
}

function Fixture() {
  const [caseId, setCaseId] = useState(window.chatInitialCase)
  const [open, setOpen] = useState(true)
  return <>
    <button onClick={() => {
      window.history.replaceState(null, '', '/chat/thread-b')
      setCaseId('thread-b')
    }}>Ouvrir le fil B</button>
    <button onClick={() => {
      window.history.replaceState(null, '', '/dashboard')
      setOpen(false)
    }}>Quitter la conversation</button>
    {open ? <Conversation initialCaseId={caseId} /> : <p>Tableau de bord synthétique</p>}
    <Toaster />
  </>
}

// Real hooks and React lifecycle; the outer controls model route changes/unmounting.
createRoot(document.getElementById('root')!).render(<StrictMode><Fixture /></StrictMode>)
