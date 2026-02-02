-- 0011_tile_metric_preferences.sql
-- Allow investors to configure which metrics appear on company tiles in the dashboard
-- Stored per-investor per-company (same pattern as logo_url)

-- ============================================================
-- 1. Schema Changes
-- ============================================================

-- Add tile metric preference columns to investor_company_relationships
ALTER TABLE public.investor_company_relationships
  ADD COLUMN IF NOT EXISTS tile_primary_metric text,
  ADD COLUMN IF NOT EXISTS tile_secondary_metric text;

-- Note: No new RLS policies needed.
-- The existing "relationships_investor_update_logo" policy from 0005_company_logos.sql
-- already allows investors to UPDATE their own relationships (investor_id = auth.uid()).
-- These new columns are covered by that policy.
