-- schema-legal.sql — jurispurama
-- Socle légal (NIYAMA-BRIEF.md §1) — 3 tables : legal_acceptances, cookie_consents,
-- account_deletion_requests. Copie versionnée, schéma `jurispurama`, du template
-- canonique `packages/legal/sql/001_legal_core.sql` (source de vérité écosystème,
-- ne pas diverger sans y reporter le changement).
--
-- Traçabilité (gap G11 CONFORMITE.md) : ces 3 tables étaient déjà appliquées en
-- production via le pooler Supavisor externe le 2026-08-23 (SSH VPS refusait la
-- connexion ce jour-là — cf ERRORS.md) mais aucun fichier de migration n'était
-- versionné dans le repo. Ce fichier documente et reproduit exactement ce schéma
-- (colonnes utilisées telles quelles par `src/app/api/legal/accept/route.ts`,
-- `src/app/api/legal/cookie-consent/route.ts` et `src/app/api/account/delete/route.ts`
-- — ne pas renommer une colonne ici sans mettre à jour ces routes).
--
-- Idempotent : rejouable sans erreur sur un schéma qui l'a déjà reçu
-- (CREATE TABLE IF NOT EXISTS + CREATE POLICY protégée par duplicate_object).
--
-- Exécution (pattern pooler externe documenté PIEGES.md 2026-08-23) :
--   psql -h 72.62.191.111 -p 5432 -U postgres.your-tenant-id -d postgres -f schema-legal.sql

-- 1. Preuve d'acceptation CGU/CGV/mentions/politique de confidentialité, versionnée et
--    horodatée. UNIQUE (user_id, doc_type) : permet un upsert idempotent côté app
--    (`ON CONFLICT (user_id, doc_type)`) au lieu d'un select-puis-insert non atomique.
CREATE TABLE IF NOT EXISTS jurispurama.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('mentions', 'cgu', 'cgv', 'confidentialite')),
  version TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip INET,
  user_agent TEXT,
  UNIQUE (user_id, doc_type)
);

CREATE INDEX IF NOT EXISTS legal_acceptances_user_id_idx ON jurispurama.legal_acceptances (user_id);

ALTER TABLE jurispurama.legal_acceptances ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY legal_acceptances_select_own ON jurispurama.legal_acceptances
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY legal_acceptances_insert_own ON jurispurama.legal_acceptances
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- UPDATE requise : `api/legal/accept/route.ts` fait un upsert(..., {onConflict:
-- 'user_id,doc_type'}) — sans cette policy, la branche UPDATE de l'upsert échoue
-- silencieusement en RLS pour le rôle authenticated.
DO $$ BEGIN
  CREATE POLICY legal_acceptances_update_own ON jurispurama.legal_acceptances
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Consentement cookies — 1 ligne par utilisateur authentifié (le visiteur anonyme
--    reste en localStorage côté client, cf src/lib/legal/hooks/useCookieConsent.ts,
--    et n'a pas de ligne ici).
CREATE TABLE IF NOT EXISTS jurispurama.cookie_consents (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  necessaire BOOLEAN NOT NULL DEFAULT true,
  mesure BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jurispurama.cookie_consents ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY cookie_consents_select_own ON jurispurama.cookie_consents
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cookie_consents_insert_own ON jurispurama.cookie_consents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY cookie_consents_update_own ON jurispurama.cookie_consents
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Demandes de suppression de compte avec période de grâce de 30 jours (RGPD art. 17).
--    Schéma identique à l'implémentation partagée `packages/legal/src/api/account-delete.ts`
--    réutilisée telle quelle par `src/app/api/account/delete/route.ts` — ne pas renommer
--    les colonnes sans mettre à jour cette route et le cron de suppression.
CREATE TABLE IF NOT EXISTS jurispurama.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_for TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'executing', 'completed', 'cancelled')),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS account_deletion_requests_due_idx
  ON jurispurama.account_deletion_requests (status, scheduled_for);

ALTER TABLE jurispurama.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY account_deletion_requests_select_own ON jurispurama.account_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY account_deletion_requests_insert_own ON jurispurama.account_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY account_deletion_requests_update_own ON jurispurama.account_deletion_requests
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Le rôle service_role (utilisé par le cron de suppression de compte) contourne RLS
-- nativement, aucune policy supplémentaire n'est nécessaire pour le sweep quotidien.
