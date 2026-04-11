-- JurisPurama P5 schema — Influenceurs
-- Run: docker exec psql jurispurama < schema-p5.sql

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  audience_size INTEGER DEFAULT 0,
  reason TEXT,
  approved BOOLEAN NOT NULL DEFAULT true,
  tier TEXT NOT NULL DEFAULT 'bronze',
  free_plan_granted TEXT,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_signups INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_commissions DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_influencers_user_unique UNIQUE (user_id),
  CONSTRAINT jurispurama_influencers_tier_check CHECK (
    tier IN ('bronze','argent','or','platine','diamant','legende','titan','eternel')
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_influencers_user_idx
  ON jurispurama.jurispurama_influencers (user_id);
CREATE INDEX IF NOT EXISTS jurispurama_influencers_slug_idx
  ON jurispurama.jurispurama_influencers (slug);

ALTER TABLE jurispurama.jurispurama_influencers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'jurispurama'
      AND tablename = 'jurispurama_influencers'
      AND policyname = 'influencers_select_own_or_admin'
  ) THEN
    CREATE POLICY influencers_select_own_or_admin
      ON jurispurama.jurispurama_influencers
      FOR SELECT USING (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users
          WHERE auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'jurispurama'
      AND tablename = 'jurispurama_influencers'
      AND policyname = 'influencers_insert_own'
  ) THEN
    CREATE POLICY influencers_insert_own
      ON jurispurama.jurispurama_influencers
      FOR INSERT WITH CHECK (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users
          WHERE auth_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'jurispurama'
      AND tablename = 'jurispurama_influencers'
      AND policyname = 'influencers_update_own_or_admin'
  ) THEN
    CREATE POLICY influencers_update_own_or_admin
      ON jurispurama.jurispurama_influencers
      FOR UPDATE USING (
        user_id IN (
          SELECT id FROM jurispurama.jurispurama_users
          WHERE auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      );
  END IF;
END $$;
