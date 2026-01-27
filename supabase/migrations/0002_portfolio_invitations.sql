-- Portfolio invitations table (stores contact info + invitation status)
create table if not exists public.portfolio_invitations (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'accepted')),
  invite_token uuid default gen_random_uuid(),
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_id, company_id)
);

-- RLS policies
alter table public.portfolio_invitations enable row level security;

-- Investors can CRUD their own invitations
create policy "invitations_investor_crud"
on public.portfolio_invitations for all to authenticated
using (investor_id = auth.uid())
with check (investor_id = auth.uid());

-- Allow lookup by invite token for signup flow (no auth required for select)
create policy "invitations_lookup_by_token"
on public.portfolio_invitations for select to authenticated
using (true);

-- Allow insert to companies for investors (for CSV import)
-- Investors create companies without a founder initially
create policy "companies_insert_investor"
on public.companies for insert to authenticated
with check (founder_id is null);

-- Allow investors to update companies they have relationships with (to set founder_id)
create policy "companies_update_investor"
on public.companies for update to authenticated
using (
  exists (
    select 1 from public.investor_company_relationships
    where investor_id = auth.uid() and company_id = companies.id
  )
);

-- Allow insert to investor_company_relationships for investors
create policy "relationships_insert_investor"
on public.investor_company_relationships for insert to authenticated
with check (investor_id = auth.uid());

-- Trigger for updated_at
create trigger portfolio_invitations_set_updated_at
before update on public.portfolio_invitations
for each row execute procedure public.set_updated_at();

-- Index for faster lookups
create index if not exists idx_portfolio_invitations_investor on public.portfolio_invitations(investor_id);
create index if not exists idx_portfolio_invitations_token on public.portfolio_invitations(invite_token);
create index if not exists idx_portfolio_invitations_email on public.portfolio_invitations(email);
