-- 0050_realtime_publication.sql
-- Add chat tables to Supabase Realtime publication for live message delivery.

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
