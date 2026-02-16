-- Fix: Restore founder SELECT policy on company_metric_values
--
-- Migration 0037 dropped "company_metric_values_founder_select" assuming
-- it was fully superseded by the combined "company_metric_values_investor_select"
-- policy from 0018. However, that policy's founder branch uses a subquery
-- against the companies table which itself is gated by RLS — creating a
-- chain that works for investors (via user_has_company_access) but silently
-- returns 0 rows for founders in some query contexts.
--
-- This restores a simple, direct founder SELECT policy.

CREATE POLICY "company_metric_values_founder_select"
ON public.company_metric_values
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_metric_values.company_id
      AND c.founder_id = auth.uid()
  )
);
