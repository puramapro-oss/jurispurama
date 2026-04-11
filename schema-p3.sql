-- =====================================================
-- JurisPurama P3 — Storage bucket + scans table
-- Run with:
--   docker exec -i supabase-db psql -U postgres -d postgres < schema-p3.sql
-- =====================================================

-- Create private storage bucket for documents (PDFs, scans, uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jurispurama-documents',
  'jurispurama-documents',
  false,
  20971520,  -- 20 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies (service_role always has access)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'jurispurama_docs_select_own'
  ) THEN
    CREATE POLICY jurispurama_docs_select_own ON storage.objects
      FOR SELECT USING (
        bucket_id = 'jurispurama-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'jurispurama_docs_insert_own'
  ) THEN
    CREATE POLICY jurispurama_docs_insert_own ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'jurispurama-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'jurispurama_docs_delete_own'
  ) THEN
    CREATE POLICY jurispurama_docs_delete_own ON storage.objects
      FOR DELETE USING (
        bucket_id = 'jurispurama-documents'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- =====================================================
-- jurispurama_scans — OCR history
-- =====================================================

CREATE TABLE IF NOT EXISTS jurispurama.jurispurama_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES jurispurama.jurispurama_users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES jurispurama.jurispurama_cases(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  detected_type TEXT,
  extracted_text TEXT,
  extracted_fields JSONB,
  insights JSONB,
  recommended_actions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jurispurama_scans_user_idx
  ON jurispurama.jurispurama_scans (user_id);
CREATE INDEX IF NOT EXISTS jurispurama_scans_case_idx
  ON jurispurama.jurispurama_scans (case_id);

ALTER TABLE jurispurama.jurispurama_scans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'jurispurama' AND tablename = 'jurispurama_scans'
      AND policyname = 'scans_all_own'
  ) THEN
    CREATE POLICY scans_all_own ON jurispurama.jurispurama_scans
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

-- =====================================================
-- jurispurama_documents — P3 additions
-- =====================================================

-- Add soft-delete + storage path columns if missing
ALTER TABLE jurispurama.jurispurama_documents
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generated_data JSONB;

CREATE INDEX IF NOT EXISTS jurispurama_documents_deleted_idx
  ON jurispurama.jurispurama_documents (deleted_at);

-- Allow 'scan' type in documents (no enum, TEXT field)
-- Quota helper: count docs in current month for a user
CREATE OR REPLACE FUNCTION jurispurama.count_docs_this_month(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::INTEGER
  FROM jurispurama.jurispurama_documents d
  JOIN jurispurama.jurispurama_cases c ON c.id = d.case_id
  WHERE c.user_id = p_user_id
    AND d.deleted_at IS NULL
    AND d.created_at >= date_trunc('month', now());
$$;

GRANT EXECUTE ON FUNCTION jurispurama.count_docs_this_month(UUID) TO authenticated, service_role;
