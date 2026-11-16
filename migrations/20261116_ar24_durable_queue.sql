-- Prospective AR24 tracking and receipt notifications. Apply only after review.
-- Requires schema.sql, schema-p3.sql, schema-p4.sql and schema-legal.sql.
-- No provider activation, business-date rewrite or historical email replay.
BEGIN;

-- Fail the transaction before creating anything if a required application schema
-- is missing. PL/pgSQL otherwise resolves relation names only at first execution.
DO $$ BEGIN
  PERFORM d.id, d.case_id, d.title, d.sent_to, d.sent_at, d.sent_status, d.tracking_number, d.ar_received_at, d.deleted_at
    FROM jurispurama.jurispurama_documents d LIMIT 0;
  PERFORM c.id, c.user_id FROM jurispurama.jurispurama_cases c LIMIT 0;
  PERFORM u.id, u.auth_user_id, u.email, u.full_name FROM jurispurama.jurispurama_users u LIMIT 0;
  PERFORM m.case_id, m.role, m.content, m.attachments FROM jurispurama.jurispurama_messages m LIMIT 0;
  PERFORM n.user_id, n.type, n.title, n.message, n.link FROM jurispurama.jurispurama_notifications n LIMIT 0;
  PERFORM r.user_id, r.status FROM jurispurama.account_deletion_requests r LIMIT 0;
END $$;

CREATE TABLE jurispurama.ar24_tracking_state (
  document_id uuid PRIMARY KEY REFERENCES jurispurama.jurispurama_documents(id) ON DELETE CASCADE,
  tracking_number text NOT NULL,
  sent_at timestamptz NOT NULL,
  next_check_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_attempt_at timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_token uuid,
  lease_until timestamptz,
  last_error text,
  CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
CREATE INDEX ar24_tracking_due_idx ON jurispurama.ar24_tracking_state(next_check_at, document_id);

CREATE TABLE jurispurama.ar24_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES jurispurama.jurispurama_documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  facts jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sent', 'reconcile', 'cancelled')),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_token uuid,
  lease_until timestamptz,
  -- Exact serialized provider body, including sender and recipient. Never re-render on retry.
  payload text,
  first_attempt_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((lease_token IS NULL) = (lease_until IS NULL)),
  CHECK ((payload IS NULL) = (first_attempt_at IS NULL)),
  CHECK (payload IS NULL OR octet_length(payload) <= 131072),
  CHECK (state <> 'sent' OR provider_id IS NOT NULL)
);
CREATE INDEX ar24_outbox_due_idx ON jurispurama.ar24_notification_outbox(next_attempt_at, id) WHERE state = 'pending';
CREATE INDEX ar24_outbox_user_idx ON jurispurama.ar24_notification_outbox(user_id);

ALTER TABLE jurispurama.ar24_tracking_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurispurama.ar24_notification_outbox ENABLE ROW LEVEL SECURITY;
-- schema.sql has permissive DEFAULT PRIVILEGES. RLS alone does not cover TRUNCATE.
REVOKE ALL ON jurispurama.ar24_tracking_state, jurispurama.ar24_notification_outbox FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON jurispurama.ar24_tracking_state, jurispurama.ar24_notification_outbox TO service_role;

-- INVOKER functions: only the existing service role may execute, no elevation.
CREATE FUNCTION jurispurama.ar24_sync_tracking() RETURNS integer
LANGUAGE plpgsql SET search_path = pg_catalog, jurispurama AS $$
DECLARE changed integer;
BEGIN
  INSERT INTO jurispurama.ar24_tracking_state(document_id, tracking_number, sent_at)
    SELECT d.id, d.tracking_number, d.sent_at FROM jurispurama.jurispurama_documents d
    WHERE d.sent_status = 'sent_recommande' AND d.ar_received_at IS NULL AND d.deleted_at IS NULL
      AND d.tracking_number IS NOT NULL AND d.sent_at IS NOT NULL
    ON CONFLICT (document_id) DO UPDATE SET
      tracking_number = EXCLUDED.tracking_number, sent_at = EXCLUDED.sent_at,
      next_check_at = clock_timestamp(), lease_token = NULL, lease_until = NULL, last_error = NULL
    -- Preserve priority/leases for every unchanged reference, including errors.
    WHERE (ar24_tracking_state.tracking_number, ar24_tracking_state.sent_at)
      IS DISTINCT FROM (EXCLUDED.tracking_number, EXCLUDED.sent_at);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END $$;

CREATE FUNCTION jurispurama.ar24_claim_tracking() RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog, jurispurama AS $$
DECLARE claimed jurispurama.ar24_tracking_state;
BEGIN
  WITH candidate AS (
    SELECT q.document_id FROM jurispurama.ar24_tracking_state q
    JOIN jurispurama.jurispurama_documents d ON d.id = q.document_id
    JOIN jurispurama.jurispurama_cases c ON c.id = d.case_id
    JOIN jurispurama.jurispurama_users u ON u.id = c.user_id
    WHERE q.next_check_at <= clock_timestamp() AND (q.lease_until IS NULL OR q.lease_until <= clock_timestamp())
      AND d.deleted_at IS NULL AND d.ar_received_at IS NULL AND d.sent_status = 'sent_recommande'
      AND d.tracking_number = q.tracking_number AND d.sent_at = q.sent_at
      AND NOT EXISTS (SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = u.auth_user_id AND r.status IN ('executing', 'completed'))
    ORDER BY q.next_check_at, q.document_id FOR UPDATE OF q SKIP LOCKED LIMIT 1
  ) UPDATE jurispurama.ar24_tracking_state q SET lease_token = gen_random_uuid(),
      lease_until = clock_timestamp() + interval '2 minutes', last_attempt_at = clock_timestamp(),
      next_check_at = clock_timestamp(), attempts = q.attempts + 1
    FROM candidate x WHERE q.document_id = x.document_id RETURNING q.* INTO claimed;
  IF claimed.document_id IS NULL THEN RETURN NULL; END IF;
  RETURN to_jsonb(claimed);
END $$;

CREATE FUNCTION jurispurama.ar24_complete_tracking(p_document_id uuid, p_lease_token uuid,
  p_received_at timestamptz DEFAULT NULL, p_error text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog, jurispurama AS $$
DECLARE d jurispurama.jurispurama_documents; q jurispurama.ar24_tracking_state;
  owner_id uuid; auth_id uuid; owner_case_id uuid; event_id uuid;
BEGIN
  -- Match cascade lock order: profile/case, document, then its private control row.
  SELECT u.id, u.auth_user_id, c.id INTO owner_id, auth_id, owner_case_id
    FROM jurispurama.jurispurama_users u JOIN jurispurama.jurispurama_cases c ON c.user_id = u.id
    JOIN jurispurama.jurispurama_documents doc ON doc.case_id = c.id WHERE doc.id = p_document_id
    FOR SHARE OF u, c;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO d FROM jurispurama.jurispurama_documents WHERE id = p_document_id FOR UPDATE;
  SELECT * INTO q FROM jurispurama.ar24_tracking_state WHERE document_id = p_document_id FOR UPDATE;
  IF q.lease_token IS DISTINCT FROM p_lease_token OR p_lease_token IS NULL OR q.lease_until <= clock_timestamp()
    OR d.id IS NULL OR d.case_id IS DISTINCT FROM owner_case_id OR d.deleted_at IS NOT NULL OR d.ar_received_at IS NOT NULL OR d.sent_status <> 'sent_recommande'
    OR (q.tracking_number, q.sent_at) IS DISTINCT FROM (d.tracking_number, d.sent_at)
    OR EXISTS (SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = auth_id AND r.status IN ('executing', 'completed'))
    THEN RETURN NULL; END IF;
  IF p_received_at IS NULL THEN
    UPDATE jurispurama.ar24_tracking_state SET lease_token = NULL, lease_until = NULL,
      next_check_at = clock_timestamp() + CASE WHEN p_error IS NULL THEN interval '6 hours' ELSE interval '15 minutes' END,
      last_error = CASE WHEN p_error IS NULL THEN NULL ELSE 'status_unconfirmed' END WHERE document_id = p_document_id;
    RETURN jsonb_build_object('persisted', false, 'rescheduled', true);
  END IF;
  IF p_error IS NOT NULL OR NOT isfinite(p_received_at) OR p_received_at < d.sent_at OR p_received_at > clock_timestamp()
    THEN RAISE EXCEPTION 'Invalid receipt timestamp'; END IF;
  UPDATE jurispurama.jurispurama_documents SET ar_received_at = p_received_at WHERE id = d.id;
  INSERT INTO jurispurama.ar24_notification_outbox(document_id, user_id, facts)
    VALUES(d.id, owner_id, jsonb_build_object('document_title', d.title, 'recipient', COALESCE(d.sent_to, 'destinataire'),
      'received_at', p_received_at, 'document_id', d.id)) RETURNING id INTO event_id;
  INSERT INTO jurispurama.jurispurama_messages(case_id, role, content, attachments)
    VALUES(d.case_id, 'assistant', format('📬 **Remise signalée par le fournisseur**%s%sLe fournisseur signale la remise de "%s" le %s. Ce statut ne confirme pas l’archivage d’une preuve d’accusé de réception.%s%s[Voir le document](/documents/%s)',
      E'\n', E'\n', d.title, to_char(p_received_at AT TIME ZONE 'Europe/Paris', 'DD/MM/YYYY'), E'\n', E'\n', d.id), NULL);
  INSERT INTO jurispurama.jurispurama_notifications(user_id, type, title, message, link)
    VALUES(owner_id, 'ar_received', 'Remise signalée', format('Le fournisseur signale la remise de "%s".', d.title), '/documents/' || d.id);
  DELETE FROM jurispurama.ar24_tracking_state WHERE document_id = d.id;
  RETURN jsonb_build_object('persisted', true, 'event_id', event_id);
END $$;

CREATE FUNCTION jurispurama.ar24_claim_notification() RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog, jurispurama AS $$
DECLARE claimed jurispurama.ar24_notification_outbox; recipient_email text; recipient_name text;
BEGIN
  -- Cancellation means no new attempt, not proof that an earlier request was unsent.
  WITH invalid AS (
    SELECT q.id FROM jurispurama.ar24_notification_outbox q
    JOIN jurispurama.jurispurama_documents d ON d.id = q.document_id
    JOIN jurispurama.jurispurama_cases c ON c.id = d.case_id
    JOIN jurispurama.jurispurama_users u ON u.id = q.user_id
    WHERE q.state = 'pending' AND (q.lease_until IS NULL OR q.lease_until <= clock_timestamp())
      AND (d.deleted_at IS NOT NULL OR c.user_id <> q.user_id OR EXISTS (
        SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = u.auth_user_id AND r.status IN ('executing', 'completed')))
    FOR UPDATE OF q SKIP LOCKED
  ) UPDATE jurispurama.ar24_notification_outbox q SET state = 'cancelled', last_error = 'recipient_unavailable',
      lease_token = NULL, lease_until = NULL FROM invalid x WHERE q.id = x.id;
  -- Expired uncertainty is never converted to a fresh request/key.
  WITH expired AS (
    SELECT id FROM jurispurama.ar24_notification_outbox WHERE state = 'pending'
      AND first_attempt_at <= clock_timestamp() - interval '23 hours'
      AND (lease_until IS NULL OR lease_until <= clock_timestamp()) FOR UPDATE SKIP LOCKED
  ) UPDATE jurispurama.ar24_notification_outbox q SET state = 'reconcile', last_error = 'idempotency_window_expired',
      lease_token = NULL, lease_until = NULL FROM expired x WHERE q.id = x.id;
  WITH candidate AS (
    SELECT q.id FROM jurispurama.ar24_notification_outbox q
    JOIN jurispurama.jurispurama_documents d ON d.id = q.document_id
    JOIN jurispurama.jurispurama_cases c ON c.id = d.case_id AND c.user_id = q.user_id
    JOIN jurispurama.jurispurama_users u ON u.id = q.user_id
    WHERE q.state = 'pending' AND q.next_attempt_at <= clock_timestamp()
      AND (q.lease_until IS NULL OR q.lease_until <= clock_timestamp()) AND d.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = u.auth_user_id AND r.status IN ('executing', 'completed'))
    ORDER BY q.next_attempt_at, q.id FOR UPDATE OF q SKIP LOCKED LIMIT 1
  ) UPDATE jurispurama.ar24_notification_outbox q SET lease_token = gen_random_uuid(),
      lease_until = clock_timestamp() + interval '2 minutes', next_attempt_at = clock_timestamp(), attempts = q.attempts + 1
    FROM candidate x WHERE q.id = x.id RETURNING q.* INTO claimed;
  IF claimed.id IS NULL THEN RETURN NULL; END IF;
  SELECT email, COALESCE(full_name, email) INTO recipient_email, recipient_name FROM jurispurama.jurispurama_users WHERE id = claimed.user_id;
  RETURN to_jsonb(claimed) || jsonb_build_object('email', recipient_email, 'user_name', recipient_name);
END $$;

CREATE FUNCTION jurispurama.ar24_begin_notification(p_id uuid, p_lease_token uuid, p_payload text) RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog, jurispurama AS $$
DECLARE q jurispurama.ar24_notification_outbox; current_email text; auth_id uuid; doc_deleted timestamptz;
  doc_id uuid; recipient_id uuid; owner_case_id uuid; current_case_id uuid; body jsonb;
BEGIN
  SELECT document_id, user_id INTO doc_id, recipient_id FROM jurispurama.ar24_notification_outbox WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT u.email, u.auth_user_id, c.id INTO current_email, auth_id, owner_case_id FROM jurispurama.jurispurama_users u
    JOIN jurispurama.jurispurama_cases c ON c.user_id = u.id
    JOIN jurispurama.jurispurama_documents d ON d.case_id = c.id
    WHERE d.id = doc_id AND u.id = recipient_id FOR SHARE OF u, c;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT deleted_at, case_id INTO doc_deleted, current_case_id FROM jurispurama.jurispurama_documents WHERE id = doc_id FOR SHARE;
  IF NOT FOUND OR doc_deleted IS NOT NULL OR current_case_id IS DISTINCT FROM owner_case_id THEN RETURN NULL; END IF;
  SELECT * INTO q FROM jurispurama.ar24_notification_outbox WHERE id = p_id FOR UPDATE;
  IF q.id IS NULL OR q.state <> 'pending' OR p_lease_token IS NULL OR q.lease_token IS DISTINCT FROM p_lease_token
    OR q.lease_until <= clock_timestamp() THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = auth_id AND r.status IN ('executing', 'completed')) THEN RETURN NULL; END IF;
  IF q.first_attempt_at <= clock_timestamp() - interval '23 hours' THEN
    UPDATE jurispurama.ar24_notification_outbox SET state = 'reconcile', last_error = 'idempotency_window_expired', lease_token = NULL, lease_until = NULL WHERE id = p_id;
    RETURN NULL;
  END IF;
  body := COALESCE(q.payload, p_payload)::jsonb;
  IF body->'to' IS DISTINCT FROM jsonb_build_array(current_email) THEN
    UPDATE jurispurama.ar24_notification_outbox SET state = 'reconcile', last_error = 'recipient_changed', lease_token = NULL, lease_until = NULL WHERE id = p_id;
    RETURN NULL;
  END IF;
  IF jsonb_typeof(body) IS DISTINCT FROM 'object' OR jsonb_typeof(body->'from') IS DISTINCT FROM 'string'
    OR jsonb_typeof(body->'subject') IS DISTINCT FROM 'string' OR jsonb_typeof(body->'html') IS DISTINCT FROM 'string'
    OR length(body->>'from') = 0 OR length(body->>'subject') = 0 OR length(body->>'html') = 0
    OR octet_length(COALESCE(q.payload, p_payload)) > 131072 THEN RAISE EXCEPTION 'Invalid notification payload'; END IF;
  UPDATE jurispurama.ar24_notification_outbox SET payload = COALESCE(payload, p_payload),
    first_attempt_at = COALESCE(first_attempt_at, clock_timestamp()) WHERE id = p_id RETURNING * INTO q;
  RETURN jsonb_build_object('payload', q.payload, 'idempotency_key', 'juris-ar24-receipt/' || q.id,
    'retry_until', q.first_attempt_at + interval '23 hours');
END $$;

CREATE FUNCTION jurispurama.ar24_finish_notification(p_id uuid, p_lease_token uuid,
  p_provider_id text DEFAULT NULL, p_reconcile boolean DEFAULT false) RETURNS boolean
LANGUAGE plpgsql SET search_path = pg_catalog, jurispurama AS $$
DECLARE changed integer;
BEGIN
  IF p_provider_id IS NOT NULL AND (p_provider_id !~ '^[a-zA-Z0-9_-]{1,128}$' OR p_reconcile) THEN RAISE EXCEPTION 'Invalid provider confirmation'; END IF;
  UPDATE jurispurama.ar24_notification_outbox SET
    state = CASE WHEN p_provider_id IS NOT NULL THEN 'sent' WHEN p_reconcile THEN 'reconcile' ELSE 'pending' END,
    provider_id = p_provider_id, lease_token = NULL, lease_until = NULL,
    next_attempt_at = clock_timestamp() + interval '15 minutes',
    last_error = CASE WHEN p_provider_id IS NOT NULL THEN NULL WHEN p_reconcile THEN 'notification_reconciliation_required' ELSE 'notification_unconfirmed' END
    WHERE id = p_id AND state = 'pending' AND lease_token = p_lease_token AND lease_until > clock_timestamp()
      AND (p_provider_id IS NULL OR first_attempt_at IS NOT NULL);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END $$;

CREATE FUNCTION jurispurama.ar24_queue_status() RETURNS jsonb
LANGUAGE sql STABLE SET search_path = pg_catalog, jurispurama AS $$
  SELECT jsonb_build_object(
    'tracking_due', (SELECT count(*) FROM jurispurama.ar24_tracking_state q
      JOIN jurispurama.jurispurama_documents d ON d.id = q.document_id
      JOIN jurispurama.jurispurama_cases c ON c.id = d.case_id JOIN jurispurama.jurispurama_users u ON u.id = c.user_id
      WHERE q.next_check_at <= now() AND d.ar_received_at IS NULL AND d.deleted_at IS NULL AND d.sent_status = 'sent_recommande'
        AND d.tracking_number = q.tracking_number AND d.sent_at = q.sent_at
        AND NOT EXISTS (SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = u.auth_user_id AND r.status IN ('executing', 'completed'))),
    'email_due', (SELECT count(*) FROM jurispurama.ar24_notification_outbox q
      JOIN jurispurama.jurispurama_documents d ON d.id = q.document_id
      JOIN jurispurama.jurispurama_cases c ON c.id = d.case_id AND c.user_id = q.user_id
      JOIN jurispurama.jurispurama_users u ON u.id = q.user_id
      WHERE q.state = 'pending' AND q.next_attempt_at <= now() AND d.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM jurispurama.account_deletion_requests r WHERE r.user_id = u.auth_user_id AND r.status IN ('executing', 'completed'))),
    'reconciliation', (SELECT count(*) FROM jurispurama.ar24_notification_outbox WHERE state = 'reconcile'));
$$;

REVOKE ALL ON FUNCTION jurispurama.ar24_sync_tracking(), jurispurama.ar24_claim_tracking(),
  jurispurama.ar24_complete_tracking(uuid, uuid, timestamptz, text), jurispurama.ar24_claim_notification(),
  jurispurama.ar24_begin_notification(uuid, uuid, text), jurispurama.ar24_finish_notification(uuid, uuid, text, boolean),
  jurispurama.ar24_queue_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION jurispurama.ar24_sync_tracking(), jurispurama.ar24_claim_tracking(),
  jurispurama.ar24_complete_tracking(uuid, uuid, timestamptz, text), jurispurama.ar24_claim_notification(),
  jurispurama.ar24_begin_notification(uuid, uuid, text), jurispurama.ar24_finish_notification(uuid, uuid, text, boolean),
  jurispurama.ar24_queue_status() TO service_role;
COMMIT;
