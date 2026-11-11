-- DRAFT: additive account-deletion state guards for the reviewed jurispurama schema.
-- No role, privilege, row or original policy is created/changed by this migration.
-- The only durable changes are the three new RESTRICTIVE policies below.
-- Reviewed schema: Git blob 340ba7920659bac96d2dc619d6daf556266a2abb.
-- Canonical template follow-up required: packages/legal/sql/001_legal_core.sql.
-- This does not establish deployed PostgREST exposure, GDPR timing or completeness
-- of erasure. Owners, superusers, BYPASSRLS roles and referential actions are outside
-- the restrictions PostgreSQL applies to ordinary INSERT/UPDATE/DELETE callers.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
SET LOCAL search_path = pg_catalog;

DO $preflight$
DECLARE
  target oid := to_regclass('jurispurama.account_deletion_requests');
  auth_users oid := to_regclass('auth.users');
  table_owner oid;
  authenticated_oid oid;
  user_att smallint;
  id_att smallint;
  auth_id_att smallint;
  expected record;
BEGIN
  IF target IS NULL OR auth_users IS NULL THEN
    RAISE EXCEPTION 'RLS guard preflight: expected tables are absent';
  END IF;
  -- Lock before examining properties that concurrent table DDL could change.
  EXECUTE 'LOCK TABLE jurispurama.account_deletion_requests IN SHARE ROW EXCLUSIVE MODE';
  EXECUTE 'LOCK TABLE auth.users IN ACCESS SHARE MODE';
  target := 'jurispurama.account_deletion_requests'::regclass;
  auth_users := 'auth.users'::regclass;
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = target AND relkind = 'r' AND relrowsecurity AND NOT relhasrules
  ) OR EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = target OR inhparent = target)
    OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = target AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'RLS guard preflight: expected ordinary RLS table without inheritance, rules or custom triggers';
  END IF;

  FOR expected IN SELECT * FROM (VALUES
    ('id', 'uuid'::regtype, true),
    ('user_id', 'uuid'::regtype, true),
    ('requested_at', 'timestamptz'::regtype, true),
    ('scheduled_for', 'timestamptz'::regtype, true),
    ('reason', 'text'::regtype, false),
    ('status', 'text'::regtype, true),
    ('cancelled_at', 'timestamptz'::regtype, false),
    ('completed_at', 'timestamptz'::regtype, false)
  ) AS columns(name, type_oid, not_null)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_attribute WHERE attrelid = target AND attname = expected.name
        AND atttypid = expected.type_oid AND attnotnull = expected.not_null
        AND attnum > 0 AND NOT attisdropped AND attgenerated = ''
    ) THEN
      RAISE EXCEPTION 'RLS guard preflight: incompatible column %', expected.name;
    END IF;
  END LOOP;

  SELECT attnum INTO user_att FROM pg_attribute WHERE attrelid = target AND attname = 'user_id';
  SELECT attnum INTO id_att FROM pg_attribute WHERE attrelid = target AND attname = 'id';
  SELECT attnum INTO auth_id_att FROM pg_attribute
    WHERE attrelid = auth_users AND attname = 'id' AND atttypid = 'uuid'::regtype AND NOT attisdropped;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'p'
      AND conkey = ARRAY[id_att] AND NOT condeferrable AND convalidated)
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'u'
      AND conkey = ARRAY[user_att] AND NOT condeferrable AND convalidated)
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = target AND contype = 'f'
      AND conkey = ARRAY[user_att] AND confrelid = auth_users AND confkey = ARRAY[auth_id_att]
      AND confdeltype = 'c' AND NOT condeferrable AND convalidated) THEN
    RAISE EXCEPTION 'RLS guard preflight: expected primary key, unique user and validated auth.users cascade are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = to_regprocedure('auth.uid()')
      AND prorettype = 'uuid'::regtype AND NOT proretset) THEN
    RAISE EXCEPTION 'RLS guard preflight: auth.uid() must return one uuid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls) THEN
    RAISE EXCEPTION 'RLS guard preflight: service_role must already have BYPASSRLS; no role is changed';
  END IF;
  SELECT oid INTO authenticated_oid FROM pg_roles
    WHERE rolname = 'authenticated' AND NOT rolsuper AND NOT rolbypassrls AND NOT rolcreaterole;
  SELECT relowner INTO table_owner FROM pg_class WHERE oid = target;
  IF authenticated_oid IS NULL THEN
    RAISE EXCEPTION 'RLS guard preflight: authenticated must be an existing ordinary non-BYPASSRLS role';
  END IF;
  IF pg_has_role(authenticated_oid, table_owner, 'MEMBER')
    OR EXISTS (SELECT 1 FROM pg_roles WHERE (rolsuper OR rolbypassrls)
      AND pg_has_role(authenticated_oid, oid, 'MEMBER'))
    OR has_table_privilege(authenticated_oid, target, 'TRUNCATE') THEN
    RAISE EXCEPTION 'RLS guard preflight: authenticated can bypass row policies through ownership, role membership or TRUNCATE';
  END IF;

  -- These three policies are left byte-for-byte intact in the catalog. An
  -- unexpected definition requires review instead of replacing an existing rule.
  FOR expected IN SELECT * FROM (VALUES
    ('account_deletion_requests_select_own', 'r', '(auth.uid() = user_id)', NULL),
    ('account_deletion_requests_insert_own', 'a', NULL, '(auth.uid() = user_id)'),
    ('account_deletion_requests_update_own', 'w', '(auth.uid() = user_id)', '(auth.uid() = user_id)')
  ) AS policies(name, command, using_sql, check_sql)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polrelid = target AND polname = expected.name
        AND polpermissive AND polcmd::text = expected.command AND polroles = ARRAY[0::oid]
        AND pg_get_expr(polqual, polrelid) IS NOT DISTINCT FROM expected.using_sql
        AND pg_get_expr(polwithcheck, polrelid) IS NOT DISTINCT FROM expected.check_sql
    ) THEN
      RAISE EXCEPTION 'RLS guard preflight: unexpected or absent original policy %', expected.name;
    END IF;
  END LOOP;
END
$preflight$;

DO $guards$
DECLARE
  target oid := 'jurispurama.account_deletion_requests'::regclass;
  expected record;
BEGIN
  FOR expected IN SELECT * FROM (VALUES
    (
      'account_deletion_requests_insert_state_guard', 'a', NULL,
      '((auth.uid() = user_id) AND (status = ''scheduled''::text))',
      'CREATE POLICY account_deletion_requests_insert_state_guard ON jurispurama.account_deletion_requests AS RESTRICTIVE FOR INSERT TO PUBLIC WITH CHECK (auth.uid() = user_id AND status = ''scheduled''::text)'
    ),
    (
      'account_deletion_requests_update_state_guard', 'w',
      '((auth.uid() = user_id) AND (status = ANY (ARRAY[''scheduled''::text, ''cancelled''::text])))',
      '((auth.uid() = user_id) AND (status = ANY (ARRAY[''scheduled''::text, ''cancelled''::text])))',
      'CREATE POLICY account_deletion_requests_update_state_guard ON jurispurama.account_deletion_requests AS RESTRICTIVE FOR UPDATE TO PUBLIC USING (auth.uid() = user_id AND status = ANY (ARRAY[''scheduled''::text, ''cancelled''::text])) WITH CHECK (auth.uid() = user_id AND status = ANY (ARRAY[''scheduled''::text, ''cancelled''::text]))'
    ),
    (
      'account_deletion_requests_delete_state_guard', 'd', 'false', NULL,
      'CREATE POLICY account_deletion_requests_delete_state_guard ON jurispurama.account_deletion_requests AS RESTRICTIVE FOR DELETE TO PUBLIC USING (false)'
    )
  ) AS policies(name, command, using_sql, check_sql, create_sql)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = target AND polname = expected.name) THEN
      EXECUTE expected.create_sql;
    END IF;
    -- Replaying is a no-op only for the exact intended policy. Name collisions
    -- (including a permissive policy) fail the entire transaction atomically.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy WHERE polrelid = target AND polname = expected.name
        AND NOT polpermissive AND polcmd::text = expected.command AND polroles = ARRAY[0::oid]
        AND pg_get_expr(polqual, polrelid) IS NOT DISTINCT FROM expected.using_sql
        AND pg_get_expr(polwithcheck, polrelid) IS NOT DISTINCT FROM expected.check_sql
    ) THEN
      RAISE EXCEPTION 'RLS guard collision: incompatible policy %; no existing policy was replaced', expected.name;
    END IF;
  END LOOP;
END
$guards$;

COMMIT;
