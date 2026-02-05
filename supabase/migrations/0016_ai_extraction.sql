-- Migration: AI Metric Extraction + Source Tracking
-- Extends company_metric_values with source tracking,
-- adds metric_value_history audit trail,
-- extends document_metric_mappings for extraction results.

-- 1. Extend company_metric_values with source tracking
alter table public.company_metric_values
  add column if not exists source text not null default 'manual',
  add column if not exists source_document_id uuid references public.documents(id) on delete set null,
  add column if not exists ai_confidence double precision;

-- Add check constraint for source values
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'company_metric_values_source_check'
  ) then
    alter table public.company_metric_values
      add constraint company_metric_values_source_check
      check (source in ('manual', 'ai_extracted', 'override'));
  end if;
end $$;

-- 2. Create metric_value_history table (audit trail)
create table if not exists public.metric_value_history (
  id uuid primary key default gen_random_uuid(),
  metric_value_id uuid not null references public.company_metric_values(id) on delete cascade,
  previous_value jsonb,
  new_value jsonb,
  previous_source text,
  new_source text,
  changed_by uuid references auth.users(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now()
);

alter table public.metric_value_history enable row level security;

-- RLS: founders see their company's history
drop policy if exists "metric_value_history_founder_select" on public.metric_value_history;
create policy "metric_value_history_founder_select"
on public.metric_value_history
for select
to authenticated
using (
  exists (
    select 1
    from public.company_metric_values cmv
    join public.companies c on c.id = cmv.company_id
    where cmv.id = metric_value_history.metric_value_id
      and c.founder_id = auth.uid()
  )
);

-- RLS: approved investors can read history
drop policy if exists "metric_value_history_investor_select" on public.metric_value_history;
create policy "metric_value_history_investor_select"
on public.metric_value_history
for select
to authenticated
using (
  exists (
    select 1
    from public.company_metric_values cmv
    join public.investor_company_relationships icr
      on icr.company_id = cmv.company_id
    where cmv.id = metric_value_history.metric_value_id
      and icr.investor_id = auth.uid()
      and icr.approval_status in ('auto_approved', 'approved')
  )
);

-- 3. Extend document_metric_mappings for extraction results
-- Make metric_request_id nullable (extraction may not match a request)
alter table public.document_metric_mappings
  alter column metric_request_id drop not null;

-- Add new columns for extraction data
alter table public.document_metric_mappings
  add column if not exists metric_value_id uuid references public.company_metric_values(id) on delete set null,
  add column if not exists extracted_metric_name text,
  add column if not exists extracted_value jsonb,
  add column if not exists extracted_period_start date,
  add column if not exists extracted_period_end date,
  add column if not exists extracted_period_type text,
  add column if not exists status text not null default 'pending';

-- Add check constraint for mapping status
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'document_metric_mappings_status_check'
  ) then
    alter table public.document_metric_mappings
      add constraint document_metric_mappings_status_check
      check (status in ('pending', 'accepted', 'rejected'));
  end if;
end $$;

-- RLS: allow founders to insert mappings (for extraction results)
drop policy if exists "document_metric_mappings_founder_insert" on public.document_metric_mappings;
create policy "document_metric_mappings_founder_insert"
on public.document_metric_mappings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.documents d
    join public.companies c on c.id = d.company_id
    where d.id = document_metric_mappings.document_id
      and c.founder_id = auth.uid()
  )
);

-- RLS: allow founders to update mappings (accept/reject)
drop policy if exists "document_metric_mappings_founder_update" on public.document_metric_mappings;
create policy "document_metric_mappings_founder_update"
on public.document_metric_mappings
for update
to authenticated
using (
  exists (
    select 1
    from public.documents d
    join public.companies c on c.id = d.company_id
    where d.id = document_metric_mappings.document_id
      and c.founder_id = auth.uid()
  )
);

-- Index for faster history lookups
create index if not exists idx_metric_value_history_metric_value_id
  on public.metric_value_history(metric_value_id);

-- Index for faster extraction mapping lookups
create index if not exists idx_document_metric_mappings_document_id
  on public.document_metric_mappings(document_id);

create index if not exists idx_document_metric_mappings_status
  on public.document_metric_mappings(status);

-- Index for source_document_id lookups
create index if not exists idx_company_metric_values_source_document_id
  on public.company_metric_values(source_document_id)
  where source_document_id is not null;
