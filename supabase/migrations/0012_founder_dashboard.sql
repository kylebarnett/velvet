-- 0012_founder_dashboard.sql
-- Extends dashboard_views for founder support and adds tear_sheets table

-- ============================================================
-- 1. Extend dashboard_views for founder support
-- ============================================================

ALTER TABLE public.dashboard_views ADD COLUMN founder_id uuid REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.dashboard_views ALTER COLUMN investor_id DROP NOT NULL;
ALTER TABLE public.dashboard_views ADD CONSTRAINT dashboard_views_owner_check
  CHECK (
    (investor_id IS NOT NULL AND founder_id IS NULL)
    OR (investor_id IS NULL AND founder_id IS NOT NULL)
  );

CREATE INDEX idx_dashboard_views_founder ON public.dashboard_views(founder_id, company_id);

-- Founder RLS policy for dashboard_views
CREATE POLICY "dashboard_views_founder_all" ON public.dashboard_views
  FOR ALL TO authenticated
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

-- ============================================================
-- 2. Tear Sheets table
-- ============================================================

CREATE TABLE public.tear_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  founder_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  quarter text NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
  year integer NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  content jsonb NOT NULL DEFAULT '{}',
  share_token text UNIQUE,
  share_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, quarter, year)
);

CREATE INDEX idx_tear_sheets_founder ON public.tear_sheets(founder_id);
CREATE INDEX idx_tear_sheets_share_token ON public.tear_sheets(share_token) WHERE share_token IS NOT NULL;

-- Updated_at trigger
CREATE TRIGGER set_tear_sheets_updated_at
  BEFORE UPDATE ON public.tear_sheets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. Tear Sheets RLS Policies
-- ============================================================

ALTER TABLE public.tear_sheets ENABLE ROW LEVEL SECURITY;

-- Founders can manage their own tear sheets
CREATE POLICY "tear_sheets_founder_all" ON public.tear_sheets
  FOR ALL TO authenticated
  USING (founder_id = auth.uid())
  WITH CHECK (founder_id = auth.uid());

-- Approved investors can view published tear sheets
CREATE POLICY "tear_sheets_investor_select" ON public.tear_sheets
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.investor_company_relationships
      WHERE company_id = tear_sheets.company_id
      AND investor_id = auth.uid()
      AND approval_status IN ('auto_approved', 'approved')
    )
  );
