-- Velvet initial schema

-- Enable extensions
create extension if not exists "uuid-ossp";

-- Enums
do $$ begin
  create type public.user_role as enum ('investor', 'founder');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.period_type as enum ('monthly', 'quarterly', 'annual');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'submitted', 'overdue');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.ingestion_status as enum ('pending', 'processing', 'completed', 'failed');
exception
  when duplicate_object then null;
end $$;

-- Profiles / app users (linked to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

-- Create public.users row on signup (role + full_name from auth metadata)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_role public.user_role;
  new_full_name text;
begin
  new_role := coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'founder');
  new_full_name := coalesce(new.raw_user_meta_data->>'full_name', '');

  insert into public.users (id, email, role, full_name)
  values (new.id, new.email, new_role, nullif(new_full_name, ''))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Companies (startups)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website text,
  founder_id uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute procedure public.set_updated_at();

-- Investor <-> Company relationship (portfolio)
create table if not exists public.investor_company_relationships (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (investor_id, company_id)
);

-- Metric definitions (per investor)
create table if not exists public.metric_definitions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  period_type public.period_type not null,
  data_type text not null default 'number',
  created_at timestamptz not null default now()
);

-- Metric requests
create table if not exists public.metric_requests (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references public.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  metric_definition_id uuid not null references public.metric_definitions(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  status public.request_status not null default 'pending',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists metric_requests_set_updated_at on public.metric_requests;
create trigger metric_requests_set_updated_at
before update on public.metric_requests
for each row execute procedure public.set_updated_at();

-- Metric submissions
create table if not exists public.metric_submissions (
  id uuid primary key default gen_random_uuid(),
  metric_request_id uuid not null references public.metric_requests(id) on delete cascade,
  value jsonb not null,
  submitted_by uuid not null references public.users(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  notes text
);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size integer,
  ingestion_status public.ingestion_status not null default 'pending',
  extracted_data jsonb,
  uploaded_at timestamptz not null default now()
);

-- Document <-> metric request mapping (AI / ingestion output)
create table if not exists public.document_metric_mappings (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  metric_request_id uuid not null references public.metric_requests(id) on delete cascade,
  confidence_score double precision,
  created_at timestamptz not null default now(),
  unique (document_id, metric_request_id)
);

-- RLS
alter table public.users enable row level security;
alter table public.companies enable row level security;
alter table public.investor_company_relationships enable row level security;
alter table public.metric_definitions enable row level security;
alter table public.metric_requests enable row level security;
alter table public.metric_submissions enable row level security;
alter table public.documents enable row level security;
alter table public.document_metric_mappings enable row level security;

-- Helper: current user's role
create or replace function public.current_user_role()
returns public.user_role
language sql stable
as $$
  select role from public.users where id = auth.uid()
$$;

-- users: user can read their own profile
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users
for select
to authenticated
using (id = auth.uid());

-- users: user can update their own profile
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- companies:
-- founders can see their own company; investors can see companies in their portfolio
drop policy if exists "companies_select_founder_or_investor_portfolio" on public.companies;
create policy "companies_select_founder_or_investor_portfolio"
on public.companies
for select
to authenticated
using (
  founder_id = auth.uid()
  or exists (
    select 1 from public.investor_company_relationships r
    where r.company_id = companies.id and r.investor_id = auth.uid()
  )
);

-- investor_company_relationships: investor can see their links; founder can see links to their company
drop policy if exists "relationships_select" on public.investor_company_relationships;
create policy "relationships_select"
on public.investor_company_relationships
for select
to authenticated
using (
  investor_id = auth.uid()
  or exists (
    select 1 from public.companies c
    where c.id = investor_company_relationships.company_id and c.founder_id = auth.uid()
  )
);

-- metric_definitions: investor manages their own definitions
drop policy if exists "metric_definitions_crud_investor" on public.metric_definitions;
create policy "metric_definitions_crud_investor"
on public.metric_definitions
for all
to authenticated
using (investor_id = auth.uid() and public.current_user_role() = 'investor')
with check (investor_id = auth.uid() and public.current_user_role() = 'investor');

-- metric_requests:
-- investor can CRUD their requests; founders can read requests for their company
drop policy if exists "metric_requests_select_investor_or_founder" on public.metric_requests;
create policy "metric_requests_select_investor_or_founder"
on public.metric_requests
for select
to authenticated
using (
  investor_id = auth.uid()
  or exists (
    select 1 from public.companies c
    where c.id = metric_requests.company_id and c.founder_id = auth.uid()
  )
);

drop policy if exists "metric_requests_insert_investor" on public.metric_requests;
create policy "metric_requests_insert_investor"
on public.metric_requests
for insert
to authenticated
with check (
  investor_id = auth.uid()
  and public.current_user_role() = 'investor'
  and exists (
    select 1 from public.investor_company_relationships r
    where r.company_id = metric_requests.company_id and r.investor_id = auth.uid()
  )
);

drop policy if exists "metric_requests_update_investor" on public.metric_requests;
create policy "metric_requests_update_investor"
on public.metric_requests
for update
to authenticated
using (investor_id = auth.uid() and public.current_user_role() = 'investor')
with check (investor_id = auth.uid() and public.current_user_role() = 'investor');

-- metric_submissions:
-- investor can read; founder can insert submissions for requests tied to their company
drop policy if exists "metric_submissions_select_investor_or_founder" on public.metric_submissions;
create policy "metric_submissions_select_investor_or_founder"
on public.metric_submissions
for select
to authenticated
using (
  exists (
    select 1
    from public.metric_requests r
    join public.companies c on c.id = r.company_id
    where r.id = metric_submissions.metric_request_id
    and (r.investor_id = auth.uid() or c.founder_id = auth.uid())
  )
);

drop policy if exists "metric_submissions_insert_founder" on public.metric_submissions;
create policy "metric_submissions_insert_founder"
on public.metric_submissions
for insert
to authenticated
with check (
  submitted_by = auth.uid()
  and public.current_user_role() = 'founder'
  and exists (
    select 1
    from public.metric_requests r
    join public.companies c on c.id = r.company_id
    where r.id = metric_submissions.metric_request_id
    and c.founder_id = auth.uid()
  )
);

-- documents:
drop policy if exists "documents_select_investor_or_founder" on public.documents;
create policy "documents_select_investor_or_founder"
on public.documents
for select
to authenticated
using (
  exists (
    select 1 from public.companies c
    where c.id = documents.company_id
    and (
      c.founder_id = auth.uid()
      or exists (
        select 1 from public.investor_company_relationships r
        where r.company_id = c.id and r.investor_id = auth.uid()
      )
    )
  )
);

drop policy if exists "documents_insert_founder" on public.documents;
create policy "documents_insert_founder"
on public.documents
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and public.current_user_role() = 'founder'
  and exists (
    select 1 from public.companies c
    where c.id = documents.company_id and c.founder_id = auth.uid()
  )
);

-- document_metric_mappings: read-only to users who can read the request/document
drop policy if exists "document_metric_mappings_select" on public.document_metric_mappings;
create policy "document_metric_mappings_select"
on public.document_metric_mappings
for select
to authenticated
using (
  exists (
    select 1 from public.documents d
    where d.id = document_metric_mappings.document_id
  )
);

