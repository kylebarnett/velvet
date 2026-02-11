-- Enable RLS on Supabase's migration tracking table.
-- No policies needed — only the service role (which bypasses RLS) accesses this table.
-- This resolves the Supabase Dashboard "RLS disabled in public" critical warning.
ALTER TABLE IF EXISTS public.migration_history ENABLE ROW LEVEL SECURITY;
