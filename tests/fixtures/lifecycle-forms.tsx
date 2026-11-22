import { useCallback, useState } from 'react'
import GenerateDocumentModal from '../../src/components/chat/GenerateDocumentModal'
import SendModal from '../../src/components/documents/SendModal'
import { useScanAnalysis } from '../../src/hooks/useScanAnalysis'
import { useChatMessages } from '../../src/hooks/useChatMessages'

export function GenerateFixture() {
  const [open, setOpen] = useState(true)
  const [caseType, setCaseType] = useState('amende')
  const [revision, setRevision] = useState(0)
  const [payload, setPayload] = useState('')
  return <>
    <button onClick={() => setRevision(value => value + 1)}>Actualiser {revision}</button>
    <button onClick={() => setOpen(true)}>Ouvrir</button>
    <button onClick={() => setCaseType('travail')}>Changer de dossier</button>
    <output data-testid="generated-payload">{payload}</output>
    <GenerateDocumentModal open={open} caseType={caseType} defaultTitle={`Dossier ${caseType}`}
      onClose={() => setOpen(false)} onGenerate={value => setPayload(JSON.stringify(value))} />
  </>
}

export function SendFixture() {
  const [open, setOpen] = useState(true)
  const [title, setTitle] = useState('Document A')
  const [revision, setRevision] = useState(0)
  const [sent, setSent] = useState(0)
  return <>
    <button onClick={() => setRevision(value => value + 1)}>Actualiser {revision}</button>
    <button onClick={() => setOpen(true)}>Ouvrir</button>
    <button onClick={() => setTitle('Document B')}>Changer de titre</button>
    <output data-testid="sent-count">{sent}</output>
    <SendModal open={open} documentId="fixture-document" documentTitle={title} caseType="amende"
      onClose={() => setOpen(false)} onSent={() => setSent(value => value + 1)} />
  </>
}

function Scanner() {
  const scan = useScanAnalysis()
  return <>
    <label htmlFor="scan-file">Document à analyser</label>
    <input id="scan-file" type="file" onChange={event => scan.setFile(event.target.files?.[0] ?? null)} />
    <output data-testid="scan-preview">{scan.previewUrl ?? 'aucun aperçu'}</output>
    <output data-testid="scan-step">{scan.currentStep}</output>
    <output data-testid="scan-running">{String(scan.analyzing)}</output>
    <output data-testid="scan-result">{scan.result?.summary ?? ''}</output>
    <button onClick={scan.analyze}>Analyser</button>
    <button onClick={scan.resetAll}>Réinitialiser</button>
  </>
}

export function ScanFixture() {
  const [mounted, setMounted] = useState(true)
  return <>
    <button onClick={() => setMounted(false)}>Quitter le scanner</button>
    {mounted ? <Scanner /> : <p>Scanner fermé</p>}
  </>
}

export function ChatFixture() {
  const [caseId, setCaseId] = useState('existing-fixture')
  const scroll = useCallback(() => {}, [])
  const chat = useChatMessages(caseId, scroll)
  return <>
    <button onClick={() => setCaseId('new')}>Nouveau dossier</button>
    <button onClick={() => setCaseId('other-fixture')}>Autre dossier</button>
    <button onClick={() => setCaseId(chat.caseId ?? 'new')}>Suivre le dossier créé</button>
    <button onClick={() => chat.sendMessage('Message synthétique')}>Envoyer le message</button>
    <output data-testid="chat-id">{chat.caseId ?? 'nouveau'}</output>
    <output data-testid="chat-case">{JSON.stringify(chat.caseRow)}</output>
    <output data-testid="chat-documents">{JSON.stringify(chat.documents)}</output>
    <output data-testid="chat-loading">{String(chat.loading)}</output>
    <output data-testid="chat-streaming">{String(chat.streaming)}</output>
    <output data-testid="chat-messages">{JSON.stringify(chat.messages)}</output>
  </>
}
