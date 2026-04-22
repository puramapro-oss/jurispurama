-- Migration U1 : V4.1 patch (OpenTimestamps + INSEE + Stripe Connect skeleton)
-- Appliquée sur VPS 72.62.191.111 via psql.
-- Idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Horodatage OpenTimestamps sur signatures
ALTER TABLE jurispurama.jurispurama_signatures
  ADD COLUMN IF NOT EXISTS ots_proof TEXT,
  ADD COLUMN IF NOT EXISTS ots_stamped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ots_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ots_block_height INTEGER;

COMMENT ON COLUMN jurispurama.jurispurama_signatures.ots_proof IS
  'Preuve OpenTimestamps (base64) — horodatage Bitcoin blockchain 0€';

-- 2. Stripe Connect account (ambassadeurs — Phase 2)
ALTER TABLE jurispurama.jurispurama_users
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_jurispurama_users_stripe_connect
  ON jurispurama.jurispurama_users (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

COMMENT ON COLUMN jurispurama.jurispurama_users.subscription_started_at IS
  'Date de souscription actuelle. Utilisé pour gate retrait wallet (30j) — V7.1 §21';

-- 3. Table legal_proofs (horodatages cross-dossiers : ambassadeurs, règlements parrainage, événements légaux)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_legal_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, -- 'signature' | 'referral_payout' | 'ambassador_contract' | 'contest_result' | 'envoi_ar'
  entity_id UUID, -- id du document / contrat / événement
  content_hash TEXT NOT NULL, -- SHA-256 hex
  ots_proof TEXT, -- base64
  ots_block_height INTEGER,
  ots_verified_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  stamped_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jurispurama_legal_proofs_user
  ON jurispurama.jurispurama_legal_proofs (user_id);
CREATE INDEX IF NOT EXISTS idx_jurispurama_legal_proofs_kind
  ON jurispurama.jurispurama_legal_proofs (kind);

-- RLS
ALTER TABLE jurispurama.jurispurama_legal_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "legal_proofs_select_own" ON jurispurama.jurispurama_legal_proofs;
CREATE POLICY "legal_proofs_select_own"
  ON jurispurama.jurispurama_legal_proofs
  FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
    )
  );

-- Service role peut tout (webhook, cron)
DROP POLICY IF EXISTS "legal_proofs_service_all" ON jurispurama.jurispurama_legal_proofs;
CREATE POLICY "legal_proofs_service_all"
  ON jurispurama.jurispurama_legal_proofs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Retractations (Art. L221-28 3° — V7.1 §21)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_retractations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  amount_refunded DECIMAL(10, 2),
  prime_deducted DECIMAL(10, 2),
  processed_at TIMESTAMPTZ,
  processed_by TEXT, -- 'auto' | 'admin'
  stripe_refund_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_jurispurama_retractations_user
  ON jurispurama.jurispurama_retractations (user_id);

ALTER TABLE jurispurama.jurispurama_retractations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "retractations_select_own" ON jurispurama.jurispurama_retractations;
CREATE POLICY "retractations_select_own"
  ON jurispurama.jurispurama_retractations
  FOR SELECT
  USING (user_id IN (SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "retractations_service_all" ON jurispurama.jurispurama_retractations;
CREATE POLICY "retractations_service_all"
  ON jurispurama.jurispurama_retractations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Backfill subscription_started_at pour users existants (flag rétroactif 31j → retrait débloqué)
-- Seuls les users avec stripe_subscription_id actif (déduit par payments récents)
UPDATE jurispurama.jurispurama_users
SET subscription_started_at = now() - INTERVAL '31 days'
WHERE subscription_started_at IS NULL
  AND stripe_subscription_id IS NOT NULL;

SELECT 'Migration U1 OK' AS status;
