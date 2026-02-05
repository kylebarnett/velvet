-- Migration: Fix circular RLS on organization_members
-- The org_members_select policy has a circular dependency that prevents users
-- from seeing their own memberships. Fix by using a SECURITY DEFINER function.

-- 1. Create helper function to get user's organization IDs (bypasses RLS)
create or replace function public.user_organization_ids()
returns uuid[]
language sql stable security definer
as $$
  select coalesce(
    array_agg(organization_id),
    array[]::uuid[]
  )
  from public.organization_members
  where user_id = auth.uid();
$$;

-- 2. Replace the org_members_select policy to use the helper function
drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select"
on public.organization_members
for select
to authenticated
using (
  organization_id = any(public.user_organization_ids())
);

-- 3. Update organizations_member_select policy too for consistency
drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select"
on public.organizations
for select
to authenticated
using (
  id = any(public.user_organization_ids())
  or owner_id = auth.uid()
);

-- 4. Update org_invitations_select policy
drop policy if exists "org_invitations_select" on public.organization_invitations;
create policy "org_invitations_select"
on public.organization_invitations
for select
to authenticated
using (
  organization_id = any(public.user_organization_ids())
);
