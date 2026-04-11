-- =====================================================
-- JurisPurama schema — full P1 setup
-- Schema: jurispurama (self-hosted Supabase)
-- Run with:
--   docker exec -i supabase-db psql -U postgres -d postgres < schema.sql
-- =====================================================

-- Create schema and grant access to PostgREST roles
CREATE SCHEMA IF NOT EXISTS jurispurama;

GRANT USAGE ON SCHEMA jurispurama TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA jurispurama TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA jurispurama TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA jurispurama TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA jurispurama
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jurispurama
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA jurispurama
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- =====================================================
-- Shared helpers
-- =====================================================

CREATE OR REPLACE FUNCTION jurispurama.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- jurispurama_users — profile attached to auth.users
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address JSONB,
  birth_date DATE,
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  language TEXT NOT NULL DEFAULT 'fr',
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_users_auth_user_id_key UNIQUE (auth_user_id),
  CONSTRAINT jurispurama_users_plan_check CHECK (
    subscription_plan IN ('free', 'essentiel', 'pro', 'avocat_virtuel')
  ),
  CONSTRAINT jurispurama_users_role_check CHECK (
    role IN ('user', 'admin', 'super_admin')
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_users_email_idx
  ON jurispurama.jurispurama_users (email);
CREATE INDEX IF NOT EXISTS jurispurama_users_referral_code_idx
  ON jurispurama.jurispurama_users (referral_code);
CREATE INDEX IF NOT EXISTS jurispurama_users_stripe_customer_idx
  ON jurispurama.jurispurama_users (stripe_customer_id);

DROP TRIGGER IF EXISTS set_updated_at ON jurispurama.jurispurama_users;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON jurispurama.jurispurama_users
  FOR EACH ROW EXECUTE FUNCTION jurispurama.set_updated_at();

-- =====================================================
-- jurispurama_legal_profiles — full identity for documents
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_legal_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  civility TEXT,
  first_name TEXT,
  last_name TEXT,
  birth_date DATE,
  birth_city TEXT,
  nationality TEXT,
  phone TEXT,
  email TEXT,
  address_street TEXT,
  address_zip TEXT,
  address_city TEXT,
  address_country TEXT DEFAULT 'FR',
  license_plate TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  driver_license_number TEXT,
  employer_name TEXT,
  employer_address TEXT,
  job_title TEXT,
  hire_date DATE,
  salary_gross DECIMAL,
  salary_net DECIMAL,
  contract_type TEXT,
  is_tenant BOOLEAN,
  landlord_name TEXT,
  landlord_address TEXT,
  rent_amount DECIMAL,
  lease_start_date DATE,
  social_security_number TEXT,
  tax_number TEXT,
  iban TEXT,
  bank_name TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_legal_profiles_user_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS jurispurama_legal_profiles_user_idx
  ON jurispurama.jurispurama_legal_profiles (user_id);

DROP TRIGGER IF EXISTS set_updated_at ON jurispurama.jurispurama_legal_profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON jurispurama.jurispurama_legal_profiles
  FOR EACH ROW EXECUTE FUNCTION jurispurama.set_updated_at();

-- =====================================================
-- jurispurama_cases
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  sub_type TEXT,
  status TEXT NOT NULL DEFAULT 'diagnostic',
  summary TEXT,
  strategy JSONB,
  success_probability INTEGER,
  deadlines JSONB,
  money_saved DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_cases_status_check CHECK (
    status IN ('diagnostic', 'analyse', 'document_pret', 'signe', 'envoye', 'en_attente', 'resolu')
  ),
  CONSTRAINT jurispurama_cases_probability_check CHECK (
    success_probability IS NULL OR (success_probability BETWEEN 0 AND 100)
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_cases_user_idx
  ON jurispurama.jurispurama_cases (user_id);
CREATE INDEX IF NOT EXISTS jurispurama_cases_status_idx
  ON jurispurama.jurispurama_cases (status);
CREATE INDEX IF NOT EXISTS jurispurama_cases_type_idx
  ON jurispurama.jurispurama_cases (type);

DROP TRIGGER IF EXISTS set_updated_at ON jurispurama.jurispurama_cases;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON jurispurama.jurispurama_cases
  FOR EACH ROW EXECUTE FUNCTION jurispurama.set_updated_at();

-- =====================================================
-- jurispurama_messages
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES jurispurama.jurispurama_cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_messages_role_check CHECK (
    role IN ('user', 'assistant', 'system')
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_messages_case_idx
  ON jurispurama.jurispurama_messages (case_id);

-- =====================================================
-- jurispurama_documents
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES jurispurama.jurispurama_cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  pdf_url TEXT,
  signed_pdf_url TEXT,
  signature_status TEXT NOT NULL DEFAULT 'pending',
  signature_request_id TEXT,
  sent_status TEXT NOT NULL DEFAULT 'not_sent',
  sent_at TIMESTAMPTZ,
  sent_to TEXT,
  tracking_number TEXT,
  ar_received_at TIMESTAMPTZ,
  cost DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_documents_sig_check CHECK (
    signature_status IN ('pending', 'signed', 'expired')
  ),
  CONSTRAINT jurispurama_documents_sent_check CHECK (
    sent_status IN ('not_sent', 'sent_email', 'sent_recommande', 'sent_teleservice')
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_documents_case_idx
  ON jurispurama.jurispurama_documents (case_id);

-- =====================================================
-- jurispurama_payments
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  amount DECIMAL NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_payments_type_check CHECK (
    type IN ('subscription', 'recommande', 'signature', 'dossier')
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_payments_user_idx
  ON jurispurama.jurispurama_payments (user_id);
CREATE INDEX IF NOT EXISTS jurispurama_payments_stripe_idx
  ON jurispurama.jurispurama_payments (stripe_payment_id);

-- =====================================================
-- jurispurama_referrals
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES jurispurama.jurispurama_users(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_paid DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jurispurama_referrals_status_check CHECK (
    status IN ('pending', 'converted', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS jurispurama_referrals_referrer_idx
  ON jurispurama.jurispurama_referrals (referrer_id);
CREATE INDEX IF NOT EXISTS jurispurama_referrals_code_idx
  ON jurispurama.jurispurama_referrals (code);

-- =====================================================
-- RLS policies
-- =====================================================

ALTER TABLE jurispurama.jurispurama_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.jurispurama_legal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.jurispurama_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.jurispurama_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.jurispurama_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.jurispurama_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.jurispurama_referrals ENABLE ROW LEVEL SECURITY;

-- jurispurama_users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_users' AND policyname = 'users_select_own') THEN
    CREATE POLICY users_select_own ON jurispurama.jurispurama_users
      FOR SELECT USING (
        auth.uid() = auth_user_id
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_users' AND policyname = 'users_insert_own') THEN
    CREATE POLICY users_insert_own ON jurispurama.jurispurama_users
      FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_users' AND policyname = 'users_update_own') THEN
    CREATE POLICY users_update_own ON jurispurama.jurispurama_users
      FOR UPDATE USING (
        auth.uid() = auth_user_id
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      );
  END IF;
END $$;

-- helper: user_id → auth.uid() via join
-- jurispurama_legal_profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_legal_profiles' AND policyname = 'legal_profiles_all_own') THEN
    CREATE POLICY legal_profiles_all_own ON jurispurama.jurispurama_legal_profiles
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

-- jurispurama_cases
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_cases' AND policyname = 'cases_all_own') THEN
    CREATE POLICY cases_all_own ON jurispurama.jurispurama_cases
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

-- jurispurama_messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_messages' AND policyname = 'messages_all_own') THEN
    CREATE POLICY messages_all_own ON jurispurama.jurispurama_messages
      FOR ALL USING (
        case_id IN (
          SELECT c.id FROM jurispurama.jurispurama_cases c
          JOIN jurispurama.jurispurama_users u ON u.id = c.user_id
          WHERE u.auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      ) WITH CHECK (
        case_id IN (
          SELECT c.id FROM jurispurama.jurispurama_cases c
          JOIN jurispurama.jurispurama_users u ON u.id = c.user_id
          WHERE u.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- jurispurama_documents
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_documents' AND policyname = 'documents_all_own') THEN
    CREATE POLICY documents_all_own ON jurispurama.jurispurama_documents
      FOR ALL USING (
        case_id IN (
          SELECT c.id FROM jurispurama.jurispurama_cases c
          JOIN jurispurama.jurispurama_users u ON u.id = c.user_id
          WHERE u.auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      ) WITH CHECK (
        case_id IN (
          SELECT c.id FROM jurispurama.jurispurama_cases c
          JOIN jurispurama.jurispurama_users u ON u.id = c.user_id
          WHERE u.auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- jurispurama_payments
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_payments' AND policyname = 'payments_all_own') THEN
    CREATE POLICY payments_all_own ON jurispurama.jurispurama_payments
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

-- jurispurama_referrals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_referrals' AND policyname = 'referrals_select_own') THEN
    CREATE POLICY referrals_select_own ON jurispurama.jurispurama_referrals
      FOR SELECT USING (
        referrer_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
        OR referred_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
        OR (auth.jwt() ->> 'email') = 'matiss.frasne@gmail.com'
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_referrals' AND policyname = 'referrals_insert_own') THEN
    CREATE POLICY referrals_insert_own ON jurispurama.jurispurama_referrals
      FOR INSERT WITH CHECK (
        referrer_id IN (
          SELECT id FROM jurispurama.jurispurama_users WHERE auth_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- Auth trigger: create jurispurama_users row on auth.users insert
-- =====================================================

CREATE OR REPLACE FUNCTION jurispurama.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = jurispurama, public, auth
AS $$
DECLARE
  v_full_name TEXT;
  v_ref_code TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate a short unique referral code (ignore collisions — unique index will enforce)
  v_ref_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  INSERT INTO jurispurama.jurispurama_users (
    auth_user_id, email, full_name, referral_code, subscription_plan, language, role
  ) VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_ref_code,
    'free',
    'fr',
    CASE WHEN NEW.email = 'matiss.frasne@gmail.com' THEN 'super_admin' ELSE 'user' END
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_jurispurama ON auth.users;
CREATE TRIGGER on_auth_user_created_jurispurama
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION jurispurama.handle_new_user();

-- =====================================================
-- Seed super admin (matiss.frasne@gmail.com) if auth user exists
-- =====================================================

DO $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'matiss.frasne@gmail.com' LIMIT 1;
  IF v_uid IS NOT NULL THEN
    INSERT INTO jurispurama.jurispurama_users (auth_user_id, email, full_name, referral_code, subscription_plan, role)
    VALUES (v_uid, 'matiss.frasne@gmail.com', 'Matiss Dornier', 'ADMIN001', 'avocat_virtuel', 'super_admin')
    ON CONFLICT (auth_user_id) DO UPDATE
      SET role = 'super_admin', subscription_plan = 'avocat_virtuel';
  END IF;
END $$;

-- Done
SELECT 'jurispurama schema ready' AS status;
