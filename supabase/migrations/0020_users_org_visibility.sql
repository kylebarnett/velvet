-- Migration: Allow organization members to see each other's profiles
-- Security: Users can only see profiles of people in their same organization(s)

-- Update users SELECT policy to allow org members to see each other
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own_or_org_members"
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
);

-- Add index to speed up the org member lookup
create index if not exists idx_org_members_user_org
  on public.organization_members(user_id, organization_id);
