-- Per-metric comment threads for investor-founder communication
CREATE TABLE IF NOT EXISTS metric_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  period_start date,
  period_end date,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role text NOT NULL CHECK (user_role IN ('investor', 'founder')),
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_metric_comments_company ON metric_comments(company_id, metric_name, created_at DESC);
CREATE INDEX idx_metric_comments_user ON metric_comments(user_id);

-- RLS
ALTER TABLE metric_comments ENABLE ROW LEVEL SECURITY;

-- Founders can see and create comments on their own company
CREATE POLICY "founders_manage_own_comments" ON metric_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies
      WHERE companies.id = metric_comments.company_id
      AND companies.founder_id = auth.uid()
    )
  );

-- Investors can see and create comments for companies they have approved access to
CREATE POLICY "investors_manage_comments" ON metric_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM investor_company_relationships
      WHERE investor_company_relationships.company_id = metric_comments.company_id
      AND investor_company_relationships.investor_id = auth.uid()
      AND investor_company_relationships.approval_status IN ('approved', 'auto_approved')
    )
  );
