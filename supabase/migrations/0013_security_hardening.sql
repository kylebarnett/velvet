-- 0013_security_hardening.sql
-- Fixes identified in security audit:
--   1. Restrict overly permissive invitation token lookup policy
--   2. Add missing DELETE policy for metric_requests (investors)
--   3. Add missing DELETE policy for company_metric_values (founders)
--   4. Restrict founder relationship UPDATE to approval_status column only

-- ============================================================
-- 1. Fix: portfolio_invitations SELECT policy
--    Old policy used USING (true) allowing any authenticated user
--    to enumerate all invitations. Replace with scoped access:
--    - Investors can SELECT their own invitations
--    - The signup flow uses the admin client (no RLS) for token lookup
-- ============================================================

DROP POLICY IF EXISTS "invitations_lookup_by_token" ON public.portfolio_invitations;

-- Investors can read their own invitations
CREATE POLICY "invitations_select_own"
ON public.portfolio_invitations FOR SELECT TO authenticated
USING (investor_id = auth.uid());

-- Founders can see invitations for their company (for the investors page)
CREATE POLICY "invitations_select_founder"
ON public.portfolio_invitations FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = portfolio_invitations.company_id
    AND c.founder_id = auth.uid()
  )
);

-- ============================================================
-- 2. Add DELETE policy for metric_requests
--    Investors can delete their own pending requests
-- ============================================================

DROP POLICY IF EXISTS "metric_requests_delete_investor" ON public.metric_requests;
CREATE POLICY "metric_requests_delete_investor"
ON public.metric_requests FOR DELETE TO authenticated
USING (
  investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
);

-- ============================================================
-- 3. Add DELETE policy for company_metric_values
--    Founders can delete their own company's submissions
-- ============================================================

DROP POLICY IF EXISTS "company_metric_values_founder_delete" ON public.company_metric_values;
CREATE POLICY "company_metric_values_founder_delete"
ON public.company_metric_values FOR DELETE TO authenticated
USING (
  submitted_by = auth.uid()
  AND public.current_user_role() = 'founder'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_metric_values.company_id AND c.founder_id = auth.uid()
  )
);

-- ============================================================
-- 4. Tighten founder UPDATE on investor_company_relationships
--    The old policy allowed founders to update ANY column.
--    RLS WITH CHECK cannot compare OLD vs NEW row values, so we use
--    a BEFORE UPDATE trigger to reject changes to non-approval columns.
--    The RLS policy still scopes access to the founder's own companies.
-- ============================================================

-- Keep a simple RLS policy that scopes to founder's companies
DROP POLICY IF EXISTS "relationships_founder_update_approval" ON public.investor_company_relationships;
CREATE POLICY "relationships_founder_update_approval"
ON public.investor_company_relationships FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = investor_company_relationships.company_id AND c.founder_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = investor_company_relationships.company_id AND c.founder_id = auth.uid()
  )
);

-- Trigger: reject UPDATE if founder tries to change columns other than approval_status
CREATE OR REPLACE FUNCTION public.enforce_founder_relationship_update()
RETURNS trigger AS $$
DECLARE
  caller_role text;
BEGIN
  -- Only restrict founders; investors have their own policies
  SELECT raw_user_meta_data ->> 'role' INTO caller_role
  FROM auth.users WHERE id = auth.uid();

  IF caller_role = 'founder' THEN
    -- Founders may only change approval_status
    IF NEW.investor_id IS DISTINCT FROM OLD.investor_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.is_inviting_investor IS DISTINCT FROM OLD.is_inviting_investor
    THEN
      RAISE EXCEPTION 'Founders may only update approval_status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_founder_relationship_update
  ON public.investor_company_relationships;

CREATE TRIGGER trg_enforce_founder_relationship_update
  BEFORE UPDATE ON public.investor_company_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_founder_relationship_update();
