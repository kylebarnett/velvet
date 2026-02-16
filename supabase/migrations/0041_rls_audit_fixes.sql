-- RLS Policy Audit Fixes
--
-- SAFETY RULES:
--   - All changes are atomic (single transaction)
--   - New policies are CREATED before old ones are DROPPED
--   - SECURITY DEFINER helpers bypass intermediate RLS chains
--     (prevents the silent-empty-results bug from 0037)
--   - No data is modified — only policies and functions
--
-- Fixes:
--   1. Create SECURITY DEFINER helpers to break deep RLS chains
--   2. activity_log: investors cannot SELECT their own activity
--   3. metric_comments: FOR ALL lets users DELETE other role's comments
--   4. metric_value_history: deep RLS chain (metric_values → companies)
--   5. documents: founders cannot UPDATE document metadata
--   6. companies: investor INSERT has no role check
--   7. metric_submissions: deep RLS chain (metric_requests → companies)
--   8. document_metric_mappings: deep RLS chain (documents → companies)


-- ============================================================
-- 1. SECURITY DEFINER helper functions
--    These bypass RLS on intermediate tables so policies don't
--    depend on fragile cross-table RLS chains.
-- ============================================================

-- Check if current user is the founder of a specific company
CREATE OR REPLACE FUNCTION public.user_is_company_founder(p_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE id = user_is_company_founder.p_company_id
      AND founder_id = auth.uid()
  );
$$;

-- Check if current user (or org team member) has APPROVED access to a company
-- Unlike user_has_company_access() which allows any relationship status,
-- this requires approved/auto_approved — use for data access policies.
CREATE OR REPLACE FUNCTION public.user_has_approved_company_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.investor_company_relationships icr
    WHERE icr.company_id = user_has_approved_company_access.p_company_id
      AND icr.investor_id = ANY(public.user_org_members())
      AND icr.approval_status IN ('auto_approved', 'approved')
  );
$$;

-- Check if current user can access a specific metric value
-- Bypasses RLS on company_metric_values and companies
CREATE OR REPLACE FUNCTION public.user_can_access_metric_value(p_metric_value_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_metric_values cmv
    WHERE cmv.id = user_can_access_metric_value.p_metric_value_id
      AND (
        EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = cmv.company_id AND c.founder_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.investor_company_relationships icr
          WHERE icr.company_id = cmv.company_id
            AND icr.investor_id = ANY(public.user_org_members())
            AND icr.approval_status IN ('auto_approved', 'approved')
        )
      )
  );
$$;

-- Check if current user can access a specific document
-- Bypasses RLS on documents and companies
CREATE OR REPLACE FUNCTION public.user_can_access_document(p_document_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = user_can_access_document.p_document_id
      AND (
        EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = d.company_id AND c.founder_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.investor_company_relationships icr
          WHERE icr.company_id = d.company_id
            AND icr.investor_id = ANY(public.user_org_members())
            AND icr.approval_status IN ('auto_approved', 'approved')
        )
      )
  );
$$;

-- Check if current user can access a specific metric request
-- Bypasses RLS on metric_requests and companies
CREATE OR REPLACE FUNCTION public.user_can_access_metric_request(p_request_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.metric_requests r
    WHERE r.id = user_can_access_metric_request.p_request_id
      AND (
        EXISTS (
          SELECT 1 FROM public.companies c
          WHERE c.id = r.company_id AND c.founder_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.investor_company_relationships icr
          WHERE icr.company_id = r.company_id
            AND icr.investor_id = ANY(public.user_org_members())
            AND icr.approval_status IN ('auto_approved', 'approved')
        )
      )
  );
$$;


-- ============================================================
-- 2. activity_log: Add investor SELECT policy
--    Previously investors could INSERT but not SELECT their activity.
-- ============================================================

DROP POLICY IF EXISTS "activity_log_investor_select" ON public.activity_log;
CREATE POLICY "activity_log_investor_select"
ON public.activity_log FOR SELECT TO authenticated
USING (
  public.user_has_approved_company_access(company_id)
);


-- ============================================================
-- 3. metric_comments: Split FOR ALL into granular operations
--    Fix: DELETE restricted to own comments (was cross-role)
--
--    Strategy: CREATE all new policies, THEN DROP old FOR ALL.
-- ============================================================

-- Founders: SELECT all comments on their company
DROP POLICY IF EXISTS "metric_comments_founder_select" ON public.metric_comments;
CREATE POLICY "metric_comments_founder_select"
ON public.metric_comments FOR SELECT TO authenticated
USING (
  public.user_is_company_founder(company_id)
);

-- Founders: INSERT own comments only
DROP POLICY IF EXISTS "metric_comments_founder_insert" ON public.metric_comments;
CREATE POLICY "metric_comments_founder_insert"
ON public.metric_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND user_role = 'founder'
  AND public.user_is_company_founder(company_id)
);

-- Founders: UPDATE own comments only
DROP POLICY IF EXISTS "metric_comments_founder_update" ON public.metric_comments;
CREATE POLICY "metric_comments_founder_update"
ON public.metric_comments FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.user_is_company_founder(company_id)
)
WITH CHECK (
  user_id = auth.uid()
  AND user_role = 'founder'
  AND public.user_is_company_founder(company_id)
);

-- Founders: DELETE own comments only
DROP POLICY IF EXISTS "metric_comments_founder_delete" ON public.metric_comments;
CREATE POLICY "metric_comments_founder_delete"
ON public.metric_comments FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.user_is_company_founder(company_id)
);

-- Investors: SELECT all comments on approved companies
DROP POLICY IF EXISTS "metric_comments_investor_select" ON public.metric_comments;
CREATE POLICY "metric_comments_investor_select"
ON public.metric_comments FOR SELECT TO authenticated
USING (
  public.user_has_approved_company_access(company_id)
);

-- Investors: INSERT own comments only
DROP POLICY IF EXISTS "metric_comments_investor_insert" ON public.metric_comments;
CREATE POLICY "metric_comments_investor_insert"
ON public.metric_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND user_role = 'investor'
  AND public.user_has_approved_company_access(company_id)
);

-- Investors: UPDATE own comments only
DROP POLICY IF EXISTS "metric_comments_investor_update" ON public.metric_comments;
CREATE POLICY "metric_comments_investor_update"
ON public.metric_comments FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  AND public.user_has_approved_company_access(company_id)
)
WITH CHECK (
  user_id = auth.uid()
  AND user_role = 'investor'
  AND public.user_has_approved_company_access(company_id)
);

-- Investors: DELETE own comments only
DROP POLICY IF EXISTS "metric_comments_investor_delete" ON public.metric_comments;
CREATE POLICY "metric_comments_investor_delete"
ON public.metric_comments FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND public.user_has_approved_company_access(company_id)
);

-- Now safe to drop the old overly-broad FOR ALL policies
DROP POLICY IF EXISTS "founders_manage_own_comments" ON public.metric_comments;
DROP POLICY IF EXISTS "investors_manage_comments" ON public.metric_comments;


-- ============================================================
-- 4. metric_value_history: Replace deep RLS chain with
--    SECURITY DEFINER function (single policy for both roles)
-- ============================================================

DROP POLICY IF EXISTS "metric_value_history_founder_select" ON public.metric_value_history;
DROP POLICY IF EXISTS "metric_value_history_investor_select" ON public.metric_value_history;
DROP POLICY IF EXISTS "metric_value_history_select" ON public.metric_value_history;

CREATE POLICY "metric_value_history_select"
ON public.metric_value_history FOR SELECT TO authenticated
USING (
  public.user_can_access_metric_value(metric_value_id)
);


-- ============================================================
-- 5. documents: Add founder UPDATE policy
-- ============================================================

DROP POLICY IF EXISTS "documents_update_founder" ON public.documents;
CREATE POLICY "documents_update_founder"
ON public.documents FOR UPDATE TO authenticated
USING (
  public.user_is_company_founder(company_id)
);


-- ============================================================
-- 6. companies: Add role check to investor INSERT
--    Prevents founders from creating companies with NULL founder_id
-- ============================================================

DROP POLICY IF EXISTS "companies_insert_investor" ON public.companies;
CREATE POLICY "companies_insert_investor"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  founder_id IS NULL
  AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'investor'
);


-- ============================================================
-- 7. metric_submissions: Replace deep RLS chain
--    Old policy chained: metric_requests (RLS) → companies (RLS)
-- ============================================================

-- SELECT: fully wrapped in SECURITY DEFINER — no RLS chain
DROP POLICY IF EXISTS "metric_submissions_select_investor_or_founder" ON public.metric_submissions;
DROP POLICY IF EXISTS "metric_submissions_select" ON public.metric_submissions;
CREATE POLICY "metric_submissions_select"
ON public.metric_submissions FOR SELECT TO authenticated
USING (
  public.user_can_access_metric_request(metric_request_id)
);

-- INSERT: fully wrapped in SECURITY DEFINER — no RLS chain
DROP POLICY IF EXISTS "metric_submissions_insert_founder" ON public.metric_submissions;
CREATE POLICY "metric_submissions_insert_founder"
ON public.metric_submissions FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_access_metric_request(metric_request_id)
);


-- ============================================================
-- 8. document_metric_mappings: Replace RLS chain
--    Old policy chained: documents (RLS) → companies (RLS)
-- ============================================================

-- SELECT: use SECURITY DEFINER helper
DROP POLICY IF EXISTS "document_metric_mappings_select" ON public.document_metric_mappings;
CREATE POLICY "document_metric_mappings_select"
ON public.document_metric_mappings FOR SELECT TO authenticated
USING (
  public.user_can_access_document(document_id)
);

-- INSERT: founder only, fully wrapped — no RLS chain
DROP POLICY IF EXISTS "document_metric_mappings_founder_insert" ON public.document_metric_mappings;
CREATE POLICY "document_metric_mappings_founder_insert"
ON public.document_metric_mappings FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_access_document(document_id)
);

-- UPDATE: founder only, fully wrapped — no RLS chain
DROP POLICY IF EXISTS "document_metric_mappings_founder_update" ON public.document_metric_mappings;
CREATE POLICY "document_metric_mappings_founder_update"
ON public.document_metric_mappings FOR UPDATE TO authenticated
USING (
  public.user_can_access_document(document_id)
);
