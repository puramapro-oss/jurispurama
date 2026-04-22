/**
 * OpenTimestamps — Horodatage blockchain Bitcoin gratuit
 * Remplace OriginStamp (retired 31 mai 2025). Voir §36.2 CLAUDE.md.
 *
 * Usage JurisPurama :
 * - Preuve horodatée signatures contrats ambassadeurs
 * - Preuve horodatée envois AR24 (complément du cachet AR24)
 * - Règlements jeux-concours parrainage (alternative huissier)
 *
 * Terme UI : "Preuve blockchain Purama" (jamais "OpenTimestamps" / "Bitcoin").
 */

import crypto from 'crypto';

// Import dynamique pour compat Next.js (lib est CommonJS + utilise des APIs Node natives)
async function getOTS() {
  const mod = await import('javascript-opentimestamps');
  // javascript-opentimestamps expose soit default soit directement les propriétés
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any).default ?? mod;
}

/**
 * Horodate un contenu arbitraire (string ou Buffer).
 * Retourne la preuve OTS sérialisée en base64 — à stocker en DB.
 *
 * Coût : 0€ (serveurs calendars publics OpenTimestamps)
 * Latence : ~500ms (1 seconde max)
 */
export async function stampHash(data: string | Buffer): Promise<string> {
  const OpenTimestamps = await getOTS();
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  const hash = crypto.createHash('sha256').update(buffer).digest();

  const detachedFile = OpenTimestamps.DetachedTimestampFile.fromHash(
    new OpenTimestamps.Ops.OpSHA256(),
    hash
  );

  await OpenTimestamps.stamp(detachedFile);
  return Buffer.from(detachedFile.serializeToBytes()).toString('base64');
}

export interface VerificationResult {
  verified: boolean;
  blockHeight?: number;
  timestamp?: Date;
  pending?: boolean;
}

/**
 * Vérifie une preuve OTS contre le contenu original.
 *
 * Note : les preuves fraîches sont "pending" tant que Bitcoin n'a pas
 * inclus le merkle root dans un bloc (~1-2h). Après upgrade (appel .upgrade()),
 * la preuve devient définitive.
 */
export async function verifyProof(
  data: string | Buffer,
  proofBase64: string
): Promise<VerificationResult> {
  const OpenTimestamps = await getOTS();
  const buffer = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
  const hash = crypto.createHash('sha256').update(buffer).digest();

  const detachedOriginal = OpenTimestamps.DetachedTimestampFile.fromHash(
    new OpenTimestamps.Ops.OpSHA256(),
    hash
  );
  const detachedProof = OpenTimestamps.DetachedTimestampFile.deserialize(
    Buffer.from(proofBase64, 'base64')
  );

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await OpenTimestamps.verify(detachedProof, detachedOriginal);
    if (result?.bitcoin) {
      return {
        verified: true,
        blockHeight: result.bitcoin.height,
        timestamp: new Date(result.bitcoin.timestamp * 1000),
      };
    }
    return { verified: false, pending: true };
  } catch {
    return { verified: false };
  }
}

/**
 * Helper métier JurisPurama : horodate un document (contrat signé, envoi AR24).
 * Stocke le résultat dans la table passée en paramètre via supabaseAdmin.
 */
export async function stampDocument(content: string): Promise<{
  hashSha256: string;
  proofBase64: string;
  stampedAt: string;
}> {
  const sha256 = crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
  const proofBase64 = await stampHash(content);
  return {
    hashSha256: sha256,
    proofBase64,
    stampedAt: new Date().toISOString(),
  };
}
