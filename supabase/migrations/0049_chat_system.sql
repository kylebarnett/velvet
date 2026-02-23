-- 0049_chat_system.sql
-- Real-time team chat system for investor organizations.
-- Tables: conversations, conversation_participants, messages,
--         message_reactions, read_receipts, user_favorites.

-- ============================================================
-- 1. conversations
-- ============================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text,                        -- null for 1:1 DMs
  is_group boolean not null default false,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create index if not exists idx_conversations_org_updated
  on public.conversations(organization_id, updated_at desc);

-- ============================================================
-- 2. conversation_participants
-- ============================================================

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,              -- soft-leave
  cleared_at timestamptz,           -- hide messages before this timestamp
  unique (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create index if not exists idx_conv_participants_user_active
  on public.conversation_participants(user_id)
  where left_at is null;

create index if not exists idx_conv_participants_conv_active
  on public.conversation_participants(conversation_id)
  where left_at is null;

-- ============================================================
-- 3. messages
-- ============================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type public.message_type as enum ('text', 'file', 'system');
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 4000),
  message_type public.message_type not null default 'text',
  file_url text,
  file_name text,
  file_size integer,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz              -- soft delete
);

alter table public.messages enable row level security;

create index if not exists idx_messages_conv_created
  on public.messages(conversation_id, created_at desc)
  where deleted_at is null;

-- ============================================================
-- 4. message_reactions
-- ============================================================

create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.message_reactions enable row level security;

create index if not exists idx_message_reactions_message
  on public.message_reactions(message_id);

-- ============================================================
-- 5. read_receipts
-- ============================================================

create table if not exists public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_message_id uuid references public.messages(id) on delete set null,
  last_read_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);

alter table public.read_receipts enable row level security;

create index if not exists idx_read_receipts_user
  on public.read_receipts(user_id);

-- ============================================================
-- 6. user_favorites
-- ============================================================

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  favorite_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, favorite_user_id),
  check (user_id != favorite_user_id)
);

alter table public.user_favorites enable row level security;

create index if not exists idx_user_favorites_user
  on public.user_favorites(user_id);

-- ============================================================
-- 7. Helper function: is user an active participant?
-- ============================================================

create or replace function public.is_conversation_participant(conv_id uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id
      and user_id = uid
      and left_at is null
  );
$$;

-- ============================================================
-- 8. RLS Policies — conversations
-- ============================================================

-- SELECT: user is active participant
drop policy if exists "conversations_participant_select" on public.conversations;
create policy "conversations_participant_select"
on public.conversations for select to authenticated
using (
  public.is_conversation_participant(id, auth.uid())
);

-- INSERT: user is member of the org and is the creator
drop policy if exists "conversations_org_member_insert" on public.conversations;
create policy "conversations_org_member_insert"
on public.conversations for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.organization_members
    where organization_id = conversations.organization_id
      and user_id = auth.uid()
  )
);

-- UPDATE: user is active participant (for title changes)
drop policy if exists "conversations_participant_update" on public.conversations;
create policy "conversations_participant_update"
on public.conversations for update to authenticated
using (
  public.is_conversation_participant(id, auth.uid())
);

-- ============================================================
-- 9. RLS Policies — conversation_participants
-- ============================================================

-- SELECT: user is active participant in the same conversation
drop policy if exists "conv_participants_select" on public.conversation_participants;
create policy "conv_participants_select"
on public.conversation_participants for select to authenticated
using (
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- INSERT: user is active participant (can add others to group chats)
drop policy if exists "conv_participants_insert" on public.conversation_participants;
create policy "conv_participants_insert"
on public.conversation_participants for insert to authenticated
with check (
  public.is_conversation_participant(conversation_id, auth.uid())
  or conversation_participants.user_id = auth.uid()
);

-- UPDATE: own row only (for clearing, leaving)
drop policy if exists "conv_participants_update" on public.conversation_participants;
create policy "conv_participants_update"
on public.conversation_participants for update to authenticated
using (user_id = auth.uid());

-- ============================================================
-- 10. RLS Policies — messages
-- ============================================================

-- SELECT: user is active participant
drop policy if exists "messages_participant_select" on public.messages;
create policy "messages_participant_select"
on public.messages for select to authenticated
using (
  public.is_conversation_participant(conversation_id, auth.uid())
);

-- INSERT: sender_id = self and is participant
drop policy if exists "messages_participant_insert" on public.messages;
create policy "messages_participant_insert"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_participant(conversation_id, auth.uid())
);

-- UPDATE: own messages only (for soft-delete / edit)
drop policy if exists "messages_sender_update" on public.messages;
create policy "messages_sender_update"
on public.messages for update to authenticated
using (sender_id = auth.uid());

-- ============================================================
-- 11. RLS Policies — message_reactions
-- ============================================================

-- SELECT: user is participant in the message's conversation
drop policy if exists "reactions_participant_select" on public.message_reactions;
create policy "reactions_participant_select"
on public.message_reactions for select to authenticated
using (
  exists (
    select 1 from public.messages m
    where m.id = message_reactions.message_id
      and public.is_conversation_participant(m.conversation_id, auth.uid())
  )
);

-- INSERT: user_id = self and is participant
drop policy if exists "reactions_participant_insert" on public.message_reactions;
create policy "reactions_participant_insert"
on public.message_reactions for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.messages m
    where m.id = message_reactions.message_id
      and public.is_conversation_participant(m.conversation_id, auth.uid())
  )
);

-- DELETE: own reactions only
drop policy if exists "reactions_own_delete" on public.message_reactions;
create policy "reactions_own_delete"
on public.message_reactions for delete to authenticated
using (user_id = auth.uid());

-- ============================================================
-- 12. RLS Policies — read_receipts
-- ============================================================

-- SELECT/INSERT/UPDATE: own rows only
drop policy if exists "read_receipts_own_select" on public.read_receipts;
create policy "read_receipts_own_select"
on public.read_receipts for select to authenticated
using (user_id = auth.uid());

drop policy if exists "read_receipts_own_insert" on public.read_receipts;
create policy "read_receipts_own_insert"
on public.read_receipts for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "read_receipts_own_update" on public.read_receipts;
create policy "read_receipts_own_update"
on public.read_receipts for update to authenticated
using (user_id = auth.uid());

-- ============================================================
-- 13. RLS Policies — user_favorites
-- ============================================================

-- SELECT/INSERT/DELETE: own rows only
drop policy if exists "user_favorites_own_select" on public.user_favorites;
create policy "user_favorites_own_select"
on public.user_favorites for select to authenticated
using (user_id = auth.uid());

drop policy if exists "user_favorites_own_insert" on public.user_favorites;
create policy "user_favorites_own_insert"
on public.user_favorites for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_favorites_own_delete" on public.user_favorites;
create policy "user_favorites_own_delete"
on public.user_favorites for delete to authenticated
using (user_id = auth.uid());

-- ============================================================
-- 14. Trigger: bump conversations.updated_at on new message
-- ============================================================

create or replace function public.bump_conversation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
    set updated_at = now()
    where id = NEW.conversation_id;
  return NEW;
end;
$$;

drop trigger if exists trg_bump_conversation_updated_at on public.messages;
create trigger trg_bump_conversation_updated_at
  after insert on public.messages
  for each row
  execute function public.bump_conversation_updated_at();
