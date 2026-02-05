-- Add preferences JSONB column to users table for storing user preferences
-- This replaces localStorage for cross-device sync

-- Add preferences column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.users.preferences IS 'User preferences stored as JSON. Includes metric_order, ui_settings, etc.';

-- Create index for faster JSONB queries if needed
CREATE INDEX IF NOT EXISTS idx_users_preferences ON public.users USING gin (preferences);
