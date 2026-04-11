-- =====================================================
-- JurisPurama P4 — Signatures + Notifications
-- =====================================================

-- jurispurama_signatures — audit trail for canvas signatures
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES jurispurama.jurispurama_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  signature_png_path TEXT NOT NULL,
  signature_hash TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  legal_basis TEXT NOT NULL DEFAULT 'Art. 1366 Code civil'
);

CREATE INDEX IF NOT EXISTS jurispurama_signatures_doc_idx
  ON jurispurama.jurispurama_signatures (document_id);
CREATE INDEX IF NOT EXISTS jurispurama_signatures_user_idx
  ON jurispurama.jurispurama_signatures (user_id);

ALTER TABLE jurispurama.jurispurama_signatures ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_signatures' AND policyname = 'signatures_all_own') THEN
    CREATE POLICY signatures_all_own ON jurispurama.jurispurama_signatures
      FOR ALL USING (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      ) WITH CHECK (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- jurispurama_notifications
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jurispurama_notifications_user_idx
  ON jurispurama.jurispurama_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS jurispurama_notifications_unread_idx
  ON jurispurama.jurispurama_notifications (user_id) WHERE read_at IS NULL;

ALTER TABLE jurispurama.jurispurama_notifications ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_notifications' AND policyname = 'notifications_all_own') THEN
    CREATE POLICY notifications_all_own ON jurispurama.jurispurama_notifications
      FOR ALL USING (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      ) WITH CHECK (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Payments table in P1 has no status_check constraint (status is free text).
-- We'll store 'simulated' in status and it will pass.
