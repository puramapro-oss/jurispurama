-- JurisPurama P6 schema — Contact + Email sequences
-- Run: docker exec psql jurispurama < schema-p6.sql

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_slug TEXT NOT NULL DEFAULT 'jurispurama',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  responded BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jurispurama_contact_messages_email_idx
  ON jurispurama.jurispurama_contact_messages (email);
CREATE INDEX IF NOT EXISTS jurispurama_contact_messages_sent_at_idx
  ON jurispurama.jurispurama_contact_messages (sent_at DESC);

ALTER TABLE jurispurama.jurispurama_contact_messages ENABLE ROW LEVEL SECURITY;

-- Admin only policy (service role bypasses RLS)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'jurispurama'
      AND tablename = 'jurispurama_contact_messages'
      AND policyname = 'contact_admin_only'
  ) THEN
    CREATE POLICY contact_admin_only ON jurispurama.jurispurama_contact_messages
      FOR SELECT
      USING (false);
  END IF;
END $$;

-- Email sequences table
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened BOOLEAN NOT NULL DEFAULT false,
  clicked BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT jurispurama_email_sequences_type_check CHECK (
    email_type IN ('welcome','day1_tip','day3','day7_upgrade','day14','day21','day30_winback','referral_success','palier','concours')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS jurispurama_email_sequences_unique_per_type
  ON jurispurama.jurispurama_email_sequences (user_id, email_type);
CREATE INDEX IF NOT EXISTS jurispurama_email_sequences_user_idx
  ON jurispurama.jurispurama_email_sequences (user_id);

ALTER TABLE jurispurama.jurispurama_email_sequences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'jurispurama'
      AND tablename = 'jurispurama_email_sequences'
      AND policyname = 'email_sequences_own_read'
  ) THEN
    CREATE POLICY email_sequences_own_read ON jurispurama.jurispurama_email_sequences
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
