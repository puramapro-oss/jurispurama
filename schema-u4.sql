-- Migration U4 — Fiscal /fiscal (seuils 1500/2500/3000 + PDF annuel)
-- V7.1 §25 NOTIFICATION FISCALE (automatique, zéro intervention Tissma)
-- Appliquée sur VPS jurispurama schema.

-- 1. Table notifications fiscales (1 notif/palier, jamais répéter)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_fiscal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  palier INTEGER NOT NULL, -- 1500, 2500, 3000, 9999 (annuel)
  sent_at TIMESTAMPTZ DEFAULT now(),
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  acknowledged BOOLEAN DEFAULT false,
  UNIQUE(user_id, palier)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_notif_user
  ON jurispurama.jurispurama_fiscal_notifications (user_id);

ALTER TABLE jurispurama.jurispurama_fiscal_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fiscal_notif_own" ON jurispurama.jurispurama_fiscal_notifications;
CREATE POLICY "fiscal_notif_own"
  ON jurispurama.jurispurama_fiscal_notifications
  FOR SELECT
  USING (user_id IN (SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "fiscal_notif_service" ON jurispurama.jurispurama_fiscal_notifications;
CREATE POLICY "fiscal_notif_service"
  ON jurispurama.jurispurama_fiscal_notifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Table récapitulatifs annuels (PDF généré 1er janvier)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_annual_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_primes DECIMAL(10, 2) DEFAULT 0,
  total_parrainage DECIMAL(10, 2) DEFAULT 0,
  total_nature DECIMAL(10, 2) DEFAULT 0,
  total_marketplace DECIMAL(10, 2) DEFAULT 0,
  total_missions DECIMAL(10, 2) DEFAULT 0,
  total_annuel DECIMAL(10, 2) DEFAULT 0,
  pdf_storage_path TEXT,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, year)
);

CREATE INDEX IF NOT EXISTS idx_annual_summaries_user
  ON jurispurama.jurispurama_annual_summaries (user_id);
CREATE INDEX IF NOT EXISTS idx_annual_summaries_year
  ON jurispurama.jurispurama_annual_summaries (year);

ALTER TABLE jurispurama.jurispurama_annual_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "annual_summaries_own" ON jurispurama.jurispurama_annual_summaries;
CREATE POLICY "annual_summaries_own"
  ON jurispurama.jurispurama_annual_summaries
  FOR SELECT
  USING (user_id IN (SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "annual_summaries_service" ON jurispurama.jurispurama_annual_summaries;
CREATE POLICY "annual_summaries_service"
  ON jurispurama.jurispurama_annual_summaries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

SELECT 'Migration U4 OK' AS status;
