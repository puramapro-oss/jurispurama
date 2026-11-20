import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import SignModal from '../../src/components/documents/SignModal'

function DocumentPage() {
  const [open, setOpen] = useState(true)
  const [revision, setRevision] = useState(0)
  const [documentId, setDocumentId] = useState('A')

  return <>
    <button onClick={() => setRevision(revision + 1)}>Actualiser {revision}</button>
    <button onClick={() => setOpen(true)}>Ouvrir</button>
    <button onClick={() => setDocumentId('B')}>Autre document</button>
    <SignModal open={open} documentId={documentId} documentTitle={documentId}
      onClose={() => setOpen(false)} onSigned={() => { throw new Error('Pas de signature dans ce test') }} />
  </>
}

const container = document.getElementById('root')
if (container) createRoot(container).render(<DocumentPage />)
