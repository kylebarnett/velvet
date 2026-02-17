-- Migration: Add logo_url to organizations for fund branding
-- Investors can upload a logo for their fund/org, visible to founders on the investors tab.

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url text;
