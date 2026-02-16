-- Fix documents_investor_select policy
-- The 0018 version (covering both founders and investors) was overwritten
-- by the 0006 version (investor-only) during a repair operation.
-- This restores the correct policy.

DROP POLICY IF EXISTS "documents_investor_select" ON public.documents;
CREATE POLICY "documents_investor_select"
ON public.documents
FOR SELECT
TO authenticated
USING (
  -- Founders see their own company docs
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = documents.company_id
      AND c.founder_id = auth.uid()
  )
  OR
  -- Approved investors (including org team members)
  EXISTS (
    SELECT 1 FROM public.investor_company_relationships icr
    WHERE icr.company_id = documents.company_id
      AND icr.investor_id = ANY(public.user_org_members())
      AND icr.approval_status IN ('auto_approved', 'approved')
  )
);
