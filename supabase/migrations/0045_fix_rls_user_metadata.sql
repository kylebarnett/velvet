-- Fix: companies_insert_investor policy references user_metadata which is
-- editable by end users. Remove the user_metadata role check — the
-- founder_id IS NULL constraint is sufficient, and all API routes already
-- enforce role checks via getApiUser().
--
-- Also copy role from raw_user_meta_data to raw_app_meta_data for all
-- existing users so that app_metadata.role is available for future secure
-- RLS checks (app_metadata is not editable by end users).

-- 1. Fix the RLS policy
DROP POLICY IF EXISTS "companies_insert_investor" ON public.companies;
CREATE POLICY "companies_insert_investor"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  founder_id IS NULL
);

-- 2. Backfill app_metadata.role from user_metadata for existing users
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', raw_user_meta_data ->> 'role')
WHERE raw_user_meta_data ->> 'role' IS NOT NULL
  AND (raw_app_meta_data ->> 'role') IS DISTINCT FROM (raw_user_meta_data ->> 'role');
