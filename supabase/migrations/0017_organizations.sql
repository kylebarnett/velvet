-- Migration: Organization/Team System
-- Adds organizations, memberships, and invitations.

-- 1. Create org_role enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_role') then
    create type public.org_role as enum ('admin', 'member', 'viewer');
  end if;
end $$;

-- 2. Create organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  org_type public.user_role not null, -- 'investor' or 'founder'
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- 3. Create organization_members table
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members enable row level security;

-- 4. Create organization_invitations table
create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

alter table public.organization_invitations enable row level security;

-- Check constraint for invitation status
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organization_invitations_status_check'
  ) then
    alter table public.organization_invitations
      add constraint organization_invitations_status_check
      check (status in ('pending', 'accepted', 'expired', 'cancelled'));
  end if;
end $$;

-- 5. Extend existing tables with organization_id
alter table public.companies
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

alter table public.investor_company_relationships
  add column if not exists organization_id uuid references public.organizations(id) on delete set null;

-- 6. RLS Policies for organizations

-- Organizations: members can read their org
drop policy if exists "organizations_member_select" on public.organizations;
create policy "organizations_member_select"
on public.organizations
for select
to authenticated
using (
  id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  )
  or owner_id = auth.uid()
);

-- Organizations: only owner (admin) can update
drop policy if exists "organizations_owner_update" on public.organizations;
create policy "organizations_owner_update"
on public.organizations
for update
to authenticated
using (owner_id = auth.uid());

-- Organizations: authenticated users can create
drop policy if exists "organizations_insert" on public.organizations;
create policy "organizations_insert"
on public.organizations
for insert
to authenticated
with check (owner_id = auth.uid());

-- Organizations: only owner can delete
drop policy if exists "organizations_owner_delete" on public.organizations;
create policy "organizations_owner_delete"
on public.organizations
for delete
to authenticated
using (owner_id = auth.uid());

-- Organization members: members can see their co-members
drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select"
on public.organization_members
for select
to authenticated
using (
  organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  )
);

-- Organization members: admins can insert
drop policy if exists "org_members_admin_insert" on public.organization_members;
create policy "org_members_admin_insert"
on public.organization_members
for insert
to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
  or
  -- Allow self-insert when joining via invitation (handled by admin client)
  organization_members.user_id = auth.uid()
);

-- Organization members: admins can update roles
drop policy if exists "org_members_admin_update" on public.organization_members;
create policy "org_members_admin_update"
on public.organization_members
for update
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

-- Organization members: admins can remove, members can leave
drop policy if exists "org_members_delete" on public.organization_members;
create policy "org_members_delete"
on public.organization_members
for delete
to authenticated
using (
  organization_members.user_id = auth.uid()
  or exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_members.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

-- Organization invitations: org members can see invitations
drop policy if exists "org_invitations_select" on public.organization_invitations;
create policy "org_invitations_select"
on public.organization_invitations
for select
to authenticated
using (
  organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid()
  )
);

-- Organization invitations: admins can create
drop policy if exists "org_invitations_admin_insert" on public.organization_invitations;
create policy "org_invitations_admin_insert"
on public.organization_invitations
for insert
to authenticated
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

-- Organization invitations: admins can cancel (update status)
drop policy if exists "org_invitations_admin_update" on public.organization_invitations;
create policy "org_invitations_admin_update"
on public.organization_invitations
for update
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

-- Organization invitations: admins can delete
drop policy if exists "org_invitations_admin_delete" on public.organization_invitations;
create policy "org_invitations_admin_delete"
on public.organization_invitations
for delete
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = organization_invitations.organization_id
      and om.user_id = auth.uid()
      and om.role = 'admin'
  )
);

-- 7. Indexes
create index if not exists idx_org_members_user_id
  on public.organization_members(user_id);

create index if not exists idx_org_members_org_id
  on public.organization_members(organization_id);

create index if not exists idx_org_invitations_token
  on public.organization_invitations(token);

create index if not exists idx_org_invitations_email
  on public.organization_invitations(email);

create index if not exists idx_companies_organization_id
  on public.companies(organization_id)
  where organization_id is not null;

create index if not exists idx_icr_organization_id
  on public.investor_company_relationships(organization_id)
  where organization_id is not null;
