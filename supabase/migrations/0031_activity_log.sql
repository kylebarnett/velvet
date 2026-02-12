-- Activity log for tracking investor data access
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_role text NOT NULL CHECK (actor_role IN ('investor', 'founder')),
  action text NOT NULL, -- 'view_dashboard', 'download_document', 'export_metrics', 'view_tear_sheet'
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_activity_log_company ON activity_log(company_id, created_at DESC);
CREATE INDEX idx_activity_log_actor ON activity_log(actor_id, created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Founders can see activity for their company
CREATE POLICY "founders_read_activity" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = activity_log.company_id
      AND companies.founder_id = auth.uid()
    )
  );

-- Investors can insert their own activity
CREATE POLICY "investors_insert_activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = actor_id);
