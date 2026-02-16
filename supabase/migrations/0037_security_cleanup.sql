-- Security cleanup migration
-- Addresses findings from comprehensive DB integrity & security audit
-- NO DATA IS DELETED — only policies and functions are modified
--
-- Fixes:
--   1. Drop stale RLS policies (circular dependency + approval bypass)
--   2. Create SECURITY DEFINER helper to safely replace circular policies
--   3. Fix search_path on 3 remaining SECURITY DEFINER functions
--   4. Tighten metric_comments policies (add WITH CHECK)
--   5. Tighten activity_log INSERT policy (add company access check)
--   6. Tighten companies_update_investor (require approval)


-- ============================================================
-- 1. Drop stale policies that cause circular RLS dependency
--    and/or bypass approval checks
-- ============================================================

-- CRITICAL: These two policies create an infinite recursion cycle:
--   companies -> investor_company_relationships -> companies -> ...
-- The 0018 policy (investor_company_relationships_select) and the new
-- function-based policies below handle access safely without recursion.
DROP POLICY IF EXISTS "relationships_select" ON public.investor_company_relationships;
DROP POLICY IF EXISTS "companies_select_founder_or_investor_portfolio" ON public.companies;

-- CRITICAL: This policy bypasses approval_status checks on documents.
-- It allows ANY investor with a relationship (even denied) to read documents.
-- The 0018 policy (documents_investor_select) properly checks approval_status.
DROP POLICY IF EXISTS "documents_select_investor_or_founder" ON public.documents;

-- MEDIUM: Redundant stale policies fully superseded by 0018_org_rls.sql.
-- Keeping them active makes the RLS policy set confusing to audit.
DROP POLICY IF EXISTS "metric_requests_select_investor_or_founder" ON public.metric_requests;
DROP POLICY IF EXISTS "company_metric_values_founder_select" ON public.company_metric_values;


-- ============================================================
-- 2. Create SECURITY DEFINER helper to break circular dependency
--    and replace dropped companies SELECT policies
-- ============================================================

-- This function checks if the current user (or any org team member)
-- has an investor relationship with a given company.
-- SECURITY DEFINER bypasses RLS on investor_company_relationships,
-- preventing the circular dependency that occurs when both tables
-- have policies that subquery each other.
CREATE OR REPLACE FUNCTION public.user_has_company_access(company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investor_company_relationships icr
    WHERE icr.company_id = user_has_company_access.company_id
    AND icr.investor_id = ANY(public.user_org_members())
  );
$$;

-- Founders can see their own company (simple check, no cross-table subquery)
DROP POLICY IF EXISTS "companies_select_founder" ON public.companies;
CREATE POLICY "companies_select_founder"
ON public.companies FOR SELECT TO authenticated
USING (founder_id = auth.uid());

-- Investors can see companies in their portfolio (via SECURITY DEFINER helper)
DROP POLICY IF EXISTS "companies_select_investor" ON public.companies;
CREATE POLICY "companies_select_investor"
ON public.companies FOR SELECT TO authenticated
USING (public.user_has_company_access(companies.id));


-- ============================================================
-- 3. Fix search_path on SECURITY DEFINER functions
--    Change from 'public' to '' (empty string) for stricter security.
--    All table references already use public. schema qualifier.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_role public.user_role;
  new_full_name text;
BEGIN
  new_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'founder');
  new_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');

  INSERT INTO public.users (id, email, role, full_name)
  VALUES (new.id, new.email, new_role, nullif(new_full_name, ''))
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_fulfill_metric_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.metric_requests mr
  SET status = 'submitted', updated_at = now()
  FROM public.metric_definitions md,
       public.investor_company_relationships icr
  WHERE mr.metric_definition_id = md.id
    AND mr.company_id = NEW.company_id
    AND lower(md.name) = lower(NEW.metric_name)
    AND md.period_type = NEW.period_type
    AND mr.period_start = NEW.period_start
    AND mr.period_end = NEW.period_end
    AND mr.status = 'pending'
    AND icr.investor_id = mr.investor_id
    AND icr.company_id = mr.company_id
    AND icr.approval_status IN ('auto_approved', 'approved');

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_reminders_on_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    UPDATE public.metric_request_reminders
    SET
      status = 'cancelled',
      cancelled_at = NOW()
    WHERE metric_request_id = NEW.id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- 4. Tighten metric_comments policies
--    Add WITH CHECK to prevent inserting with spoofed user_id/user_role
-- ============================================================

DROP POLICY IF EXISTS "founders_manage_own_comments" ON public.metric_comments;
CREATE POLICY "founders_manage_own_comments" ON public.metric_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.companies
      WHERE public.companies.id = metric_comments.company_id
      AND public.companies.founder_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND user_role = 'founder'
    AND EXISTS (
      SELECT 1 FROM public.companies
      WHERE public.companies.id = metric_comments.company_id
      AND public.companies.founder_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "investors_manage_comments" ON public.metric_comments;
CREATE POLICY "investors_manage_comments" ON public.metric_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.investor_company_relationships
      WHERE public.investor_company_relationships.company_id = metric_comments.company_id
      AND public.investor_company_relationships.investor_id = auth.uid()
      AND public.investor_company_relationships.approval_status IN ('approved', 'auto_approved')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND user_role = 'investor'
    AND EXISTS (
      SELECT 1 FROM public.investor_company_relationships
      WHERE public.investor_company_relationships.company_id = metric_comments.company_id
      AND public.investor_company_relationships.investor_id = auth.uid()
      AND public.investor_company_relationships.approval_status IN ('approved', 'auto_approved')
    )
  );


-- ============================================================
-- 5. Tighten activity_log INSERT policy
--    Require company access check so users can't log activity
--    for companies they don't have access to
-- ============================================================

DROP POLICY IF EXISTS "investors_insert_activity" ON public.activity_log;
CREATE POLICY "authenticated_insert_own_activity" ON public.activity_log
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
    AND (
      -- Founders: company they own
      EXISTS (
        SELECT 1 FROM public.companies
        WHERE public.companies.id = activity_log.company_id
        AND public.companies.founder_id = auth.uid()
      )
      OR
      -- Investors: company they have approved access to
      EXISTS (
        SELECT 1 FROM public.investor_company_relationships
        WHERE public.investor_company_relationships.company_id = activity_log.company_id
        AND public.investor_company_relationships.investor_id = auth.uid()
        AND public.investor_company_relationships.approval_status IN ('approved', 'auto_approved')
      )
    )
  );


-- ============================================================
-- 6. Tighten companies_update_investor
--    Require approved relationship (denied investors should not
--    be able to update company data)
-- ============================================================

DROP POLICY IF EXISTS "companies_update_investor" ON public.companies;
CREATE POLICY "companies_update_investor"
ON public.companies FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.investor_company_relationships
    WHERE investor_id = auth.uid()
    AND company_id = companies.id
    AND approval_status IN ('auto_approved', 'approved')
  )
);
