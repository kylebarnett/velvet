-- Migration: 0025_historical_uploads.sql
-- Bulk historical Excel upload: upload sessions, parsed values, investor-private metrics

-- ============================================================
-- 1. historical_uploads — Tracks each upload session
-- ============================================================

CREATE TABLE IF NOT EXISTS public.historical_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role text NOT NULL CHECK (user_role IN ('investor', 'founder')),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'parsed', 'reviewing', 'completed', 'failed')),
  ai_provider text,
  ai_model text,
  parsing_time_ms integer,
  total_values_detected integer NOT NULL DEFAULT 0,
  total_values_approved integer NOT NULL DEFAULT 0,
  total_values_rejected integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS historical_uploads_set_updated_at ON public.historical_uploads;
CREATE TRIGGER historical_uploads_set_updated_at
BEFORE UPDATE ON public.historical_uploads
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- 2. historical_upload_values — Individual parsed values pending review
-- ============================================================

CREATE TABLE IF NOT EXISTS public.historical_upload_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.historical_uploads(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name_detected text,
  metric_name text NOT NULL,
  period_type public.period_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  value jsonb NOT NULL,
  ai_confidence double precision CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  sheet_name text,
  cell_reference text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'conflict')),
  conflict_type text CHECK (conflict_type IN ('existing_value', 'duplicate_in_upload')),
  conflict_existing_value jsonb,
  user_edited_value text,
  user_edited_metric_name text,
  user_edited_period_start date,
  user_edited_period_end date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. investor_metric_values — Investor-private historical data
-- ============================================================

CREATE TABLE IF NOT EXISTS public.investor_metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  period_type public.period_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  value jsonb NOT NULL,
  source text NOT NULL DEFAULT 'historical_upload'
    CHECK (source IN ('historical_upload', 'manual', 'override')),
  source_upload_id uuid REFERENCES public.historical_uploads(id) ON DELETE SET NULL,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id, company_id, metric_name, period_type, period_start, period_end)
);

DROP TRIGGER IF EXISTS investor_metric_values_set_updated_at ON public.investor_metric_values;
CREATE TRIGGER investor_metric_values_set_updated_at
BEFORE UPDATE ON public.investor_metric_values
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- 4. Extend company_metric_values
-- ============================================================

-- Add 'historical_upload' to the source check constraint
ALTER TABLE public.company_metric_values DROP CONSTRAINT IF EXISTS company_metric_values_source_check;
ALTER TABLE public.company_metric_values
  ADD CONSTRAINT company_metric_values_source_check
  CHECK (source IN ('manual', 'ai_extracted', 'override', 'historical_upload'));

-- Add source_upload_id column
ALTER TABLE public.company_metric_values
  ADD COLUMN IF NOT EXISTS source_upload_id uuid REFERENCES public.historical_uploads(id) ON DELETE SET NULL;

-- ============================================================
-- 5. RLS Policies
-- ============================================================

ALTER TABLE public.historical_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historical_upload_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_metric_values ENABLE ROW LEVEL SECURITY;

-- historical_uploads: user can CRUD their own
DROP POLICY IF EXISTS "historical_uploads_user_crud" ON public.historical_uploads;
CREATE POLICY "historical_uploads_user_crud"
ON public.historical_uploads FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- historical_upload_values: via upload ownership join
DROP POLICY IF EXISTS "historical_upload_values_owner_crud" ON public.historical_upload_values;
CREATE POLICY "historical_upload_values_owner_crud"
ON public.historical_upload_values FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.historical_uploads hu
    WHERE hu.id = historical_upload_values.upload_id
    AND hu.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.historical_uploads hu
    WHERE hu.id = historical_upload_values.upload_id
    AND hu.user_id = auth.uid()
  )
);

-- investor_metric_values: investor can CRUD their own
DROP POLICY IF EXISTS "investor_metric_values_investor_crud" ON public.investor_metric_values;
CREATE POLICY "investor_metric_values_investor_crud"
ON public.investor_metric_values FOR ALL TO authenticated
USING (
  investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
)
WITH CHECK (
  investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
);

-- ============================================================
-- 6. Storage Bucket
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('historical-uploads', 'historical-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Users can upload to their own path
CREATE POLICY "historical_uploads_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'historical-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can read their own uploads
CREATE POLICY "historical_uploads_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'historical-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own uploads
CREATE POLICY "historical_uploads_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'historical-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- 7. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_historical_uploads_user_id
  ON public.historical_uploads(user_id);

CREATE INDEX IF NOT EXISTS idx_historical_uploads_status
  ON public.historical_uploads(status);

CREATE INDEX IF NOT EXISTS idx_historical_upload_values_upload_id
  ON public.historical_upload_values(upload_id);

CREATE INDEX IF NOT EXISTS idx_historical_upload_values_company_id
  ON public.historical_upload_values(company_id)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_historical_upload_values_status
  ON public.historical_upload_values(status);

CREATE INDEX IF NOT EXISTS idx_investor_metric_values_investor_company
  ON public.investor_metric_values(investor_id, company_id);

CREATE INDEX IF NOT EXISTS idx_investor_metric_values_lookup
  ON public.investor_metric_values(investor_id, company_id, metric_name, period_type, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_company_metric_values_source_upload_id
  ON public.company_metric_values(source_upload_id)
  WHERE source_upload_id IS NOT NULL;
