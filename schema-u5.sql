-- Migration U5 — Wealth Engine Phase 1
-- Tiers ambassadeur + social feed + impact + magic moment

-- 1. Table tiers ambassadeurs (Bronze → Éternel)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_ambassador_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  tier_name TEXT NOT NULL, -- 'bronze', 'argent', 'or', 'platine', 'diamant', 'legende', 'titan', 'dieu', 'eternel'
  tier_level INTEGER NOT NULL, -- 1 à 9
  threshold_referrals INTEGER NOT NULL,
  prime_eur DECIMAL(10, 2) NOT NULL,
  achieved_at TIMESTAMPTZ DEFAULT now(),
  prime_paid BOOLEAN DEFAULT false,
  prime_paid_at TIMESTAMPTZ,
  UNIQUE(user_id, tier_name)
);

CREATE INDEX IF NOT EXISTS idx_ambassador_tiers_user
  ON jurispurama.jurispurama_ambassador_tiers (user_id);

ALTER TABLE jurispurama.jurispurama_ambassador_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ambassador_tiers_own" ON jurispurama.jurispurama_ambassador_tiers;
CREATE POLICY "ambassador_tiers_own"
  ON jurispurama.jurispurama_ambassador_tiers
  FOR SELECT USING (user_id IN (SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "ambassador_tiers_service" ON jurispurama.jurispurama_ambassador_tiers;
CREATE POLICY "ambassador_tiers_service"
  ON jurispurama.jurispurama_ambassador_tiers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 2. Social feed events (événements sans montants — classement, palier, retrait, streak)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_social_feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'tier_unlocked' | 'withdrawal' | 'streak_milestone' | 'nature_score' | 'referral_milestone'
  display_first_name TEXT, -- "Alex" (prenom tronqué)
  display_message TEXT NOT NULL, -- "vient de débloquer son palier Or"
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_feed_created
  ON jurispurama.jurispurama_social_feed_events (created_at DESC);

ALTER TABLE jurispurama.jurispurama_social_feed_events ENABLE ROW LEVEL SECURITY;
-- Lecture publique (feed visible par tous les users auth)
DROP POLICY IF EXISTS "social_feed_public" ON jurispurama.jurispurama_social_feed_events;
CREATE POLICY "social_feed_public"
  ON jurispurama.jurispurama_social_feed_events
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "social_feed_service" ON jurispurama.jurispurama_social_feed_events;
CREATE POLICY "social_feed_service"
  ON jurispurama.jurispurama_social_feed_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 3. User impact (CO2, arbres, missions — agrégation pour Impact Dashboard)
CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_user_impact (
  user_id UUID PRIMARY KEY REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  cases_resolved INTEGER DEFAULT 0,
  money_saved_eur DECIMAL(10, 2) DEFAULT 0,
  legal_hours_saved INTEGER DEFAULT 0, -- estim heures avocat évitées
  documents_generated INTEGER DEFAULT 0,
  recommande_sent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE jurispurama.jurispurama_user_impact ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_impact_own" ON jurispurama.jurispurama_user_impact;
CREATE POLICY "user_impact_own"
  ON jurispurama.jurispurama_user_impact
  FOR SELECT USING (user_id IN (SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()));
DROP POLICY IF EXISTS "user_impact_service" ON jurispurama.jurispurama_user_impact;
CREATE POLICY "user_impact_service"
  ON jurispurama.jurispurama_user_impact FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 4. Magic moment — marqueur premier retrait
ALTER TABLE jurispurama.jurispurama_users
  ADD COLUMN IF NOT EXISTS first_withdrawal_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_withdrawal_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS magic_moment_seen BOOLEAN DEFAULT false;

SELECT 'Migration U5 OK' AS status;
