-- 0005_company_logos.sql
-- Per-investor company logos stored on investor_company_relationships
-- Logos are not shared - each investor can have their own logo for a company

-- ============================================================
-- 1. Schema Changes
-- ============================================================

-- Add logo_url to investor_company_relationships (per-investor logos)
ALTER TABLE public.investor_company_relationships
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Index for queries that filter by logo presence
CREATE INDEX IF NOT EXISTS idx_icr_logo_url ON public.investor_company_relationships(logo_url)
  WHERE logo_url IS NOT NULL;

-- ============================================================
-- 2. RLS Policy for Investor Updates
-- ============================================================

-- Allow investors to UPDATE their own relationships (for logo_url)
CREATE POLICY "relationships_investor_update_logo"
ON public.investor_company_relationships FOR UPDATE TO authenticated
USING (
  investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
)
WITH CHECK (
  investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
);

-- ============================================================
-- 3. Storage Setup (run in Supabase Dashboard or via SQL below)
-- ============================================================
-- Create bucket: company-logos
-- Enable public read access
-- Path format: {investor_id}/{company_id}.{ext}
