-- Migration: Organization-aware RLS policies
-- Creates helper function and updates key policies for team access.

-- 1. Helper function: returns all user IDs in the same org as the current user
-- Falls back to [auth.uid()] if user has no org (backward-compatible).
create or replace function public.user_org_members()
returns uuid[]
language sql stable security definer
as $$
  select coalesce(
    (
      select array_agg(distinct om2.user_id)
      from public.organization_members om1
      join public.organization_members om2
        on om2.organization_id = om1.organization_id
      where om1.user_id = auth.uid()
    ),
    array[auth.uid()]
  );
$$;

-- 2. Update investor_company_relationships SELECT policy
-- Allow team members to see relationships owned by any org member
drop policy if exists "investor_company_relationships_select" on public.investor_company_relationships;
create policy "investor_company_relationships_select"
on public.investor_company_relationships
for select
to authenticated
using (
  investor_id = any(public.user_org_members())
  or
  -- Founders can see relationships for their company
  exists (
    select 1 from public.companies c
    where c.id = investor_company_relationships.company_id
      and c.founder_id = auth.uid()
  )
);

-- 3. Update company_metric_values investor SELECT
-- Team members of approved investors can see values
drop policy if exists "company_metric_values_investor_select" on public.company_metric_values;
create policy "company_metric_values_investor_select"
on public.company_metric_values
for select
to authenticated
using (
  -- Founders see their own company values
  exists (
    select 1 from public.companies c
    where c.id = company_metric_values.company_id
      and c.founder_id = auth.uid()
  )
  or
  -- Approved investors (including org team members)
  exists (
    select 1 from public.investor_company_relationships icr
    where icr.company_id = company_metric_values.company_id
      and icr.investor_id = any(public.user_org_members())
      and icr.approval_status in ('auto_approved', 'approved')
  )
);

-- 4. Update metric_requests SELECT
drop policy if exists "metric_requests_select" on public.metric_requests;
create policy "metric_requests_select"
on public.metric_requests
for select
to authenticated
using (
  -- Investors see their own (and team) requests
  investor_id = any(public.user_org_members())
  or
  -- Founders see requests from approved investors for their company
  exists (
    select 1 from public.companies c
    join public.investor_company_relationships icr
      on icr.company_id = c.id
    where c.id = metric_requests.company_id
      and c.founder_id = auth.uid()
      and icr.investor_id = metric_requests.investor_id
      and icr.approval_status in ('auto_approved', 'approved')
  )
);

-- 5. Update documents investor SELECT
drop policy if exists "documents_investor_select" on public.documents;
create policy "documents_investor_select"
on public.documents
for select
to authenticated
using (
  -- Founders see their own company docs
  exists (
    select 1 from public.companies c
    where c.id = documents.company_id
      and c.founder_id = auth.uid()
  )
  or
  -- Approved investors (including org team members)
  exists (
    select 1 from public.investor_company_relationships icr
    where icr.company_id = documents.company_id
      and icr.investor_id = any(public.user_org_members())
      and icr.approval_status in ('auto_approved', 'approved')
  )
);

-- 6. Update dashboard_views SELECT
drop policy if exists "dashboard_views_select" on public.dashboard_views;
create policy "dashboard_views_select"
on public.dashboard_views
for select
to authenticated
using (
  investor_id = any(public.user_org_members())
);

-- 7. Update portfolio_reports SELECT
drop policy if exists "portfolio_reports_select" on public.portfolio_reports;
create policy "portfolio_reports_select"
on public.portfolio_reports
for select
to authenticated
using (
  investor_id = any(public.user_org_members())
);

-- 8. Update metric_templates SELECT (user templates)
drop policy if exists "metric_templates_user_select" on public.metric_templates;
create policy "metric_templates_user_select"
on public.metric_templates
for select
to authenticated
using (
  is_system = true
  or investor_id = any(public.user_org_members())
);
