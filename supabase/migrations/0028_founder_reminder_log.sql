-- Founder deadline reminder log to prevent duplicate reminder emails
CREATE TABLE IF NOT EXISTS founder_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL, -- '7d', '3d', '1d'
  period_key text NOT NULL, -- e.g. 'Q4-2025' to identify the period
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(founder_id, reminder_type, period_key)
);

-- Index for quick lookups
CREATE INDEX idx_founder_reminder_log_founder ON founder_reminder_log(founder_id, sent_at DESC);

-- RLS
ALTER TABLE founder_reminder_log ENABLE ROW LEVEL SECURITY;

-- Only the system (service role) writes to this table; founders can read their own
CREATE POLICY "founders_read_own_reminders" ON founder_reminder_log
  FOR SELECT USING (auth.uid() = founder_id);
