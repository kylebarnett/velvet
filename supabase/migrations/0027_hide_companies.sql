-- Add is_hidden column to investor_company_relationships
-- Allows investors to hide companies from their main dashboard view

ALTER TABLE public.investor_company_relationships
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_icr_investor_hidden
  ON public.investor_company_relationships (investor_id, is_hidden);
