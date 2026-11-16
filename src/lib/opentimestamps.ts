// Existing JurisPurama content hashing is preserved. Proof parsing, Merkle
// operations and attestations use official OpenTimestamps0.4.9 primitives.
// The legacy package entrypoint/request transport is not loaded.
import { createHash } from 'node:crypto'
import DetachedTimestampFile from 'opentimestamps/src/detached-timestamp-file.js'
import Ops from 'opentimestamps/src/ops.js'
import Context from 'opentimestamps/src/context.js'
import Timestamp from 'opentimestamps/src/timestamp.js'
import Notary from 'opentimestamps/src/notary.js'
import { createOtsClient, type OtsLibrary } from './ots-core.ts'

const ots = createOtsClient({ DetachedTimestampFile, Ops, Context, Timestamp, Notary } as OtsLibrary)

/** SHA256 of UTF-8 text or the exact Buffer view. A hex string remains text,
 * including the signatureHash string historically passed by the signing route. */
function contentDigest(data: string | Buffer): Uint8Array {
  const snapshot = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data)
  return createHash('sha256').update(snapshot).digest()
}

export async function stampHash(data: string | Buffer): Promise<string> {
  return ots.stampDigest(contentDigest(data))
}

export interface VerificationResult {
  verified: boolean
  blockHeight?: number
  timestamp?: Date
  pending?: boolean
}

export async function verifyProof(data: string | Buffer, proofBase64: string): Promise<VerificationResult> {
  const digest = contentDigest(data)
  try {
    const result = await ots.verifyDigest(digest, proofBase64, true)
    if (result.bitcoin) return { verified: true, blockHeight: result.bitcoin.height, timestamp: new Date(result.bitcoin.timestamp * 1000) }
    return { verified: false, pending: true }
  } catch { return { verified: false } }
}

export async function stampDocument(content: string): Promise<{ hashSha256: string; proofBase64: string; stampedAt: string }> {
  const hashSha256 = createHash('sha256').update(content, 'utf8').digest('hex')
  const proofBase64 = await stampHash(content)
  return { hashSha256, proofBase64, stampedAt: new Date().toISOString() }
}
