-- Migration: Allow founders and investors to see each other's profiles
-- when connected via investor_company_relationships.
-- Previously, the users SELECT policy only allowed same-org visibility,
-- but founders and investors are in different orgs, causing "Unknown" display.

drop policy if exists "users_select_own_or_org_members" on public.users;

create policy "users_select_own_or_org_or_linked"
on public.users
for select
to authenticated
using (
  -- Can always see own profile
  id = auth.uid()
  or
  -- Can see profiles of users in same organization
  id in (
    select om2.user_id
    from public.organization_members om1
    join public.organization_members om2 on om2.organization_id = om1.organization_id
    where om1.user_id = auth.uid()
  )
  or
  -- Founders can see investors connected to their company
  id in (
    select icr.investor_id
    from public.investor_company_relationships icr
    join public.companies c on c.id = icr.company_id
    where c.founder_id = auth.uid()
  )
  or
  -- Investors can see founders of companies they are connected to
  id in (
    select c.founder_id
    from public.investor_company_relationships icr
    join public.companies c on c.id = icr.company_id
    where icr.investor_id = auth.uid()
  )
);
