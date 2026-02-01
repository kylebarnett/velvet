-- Portfolio Reports table for saved report configurations
-- Allows investors to save and share custom report views

CREATE TABLE portfolio_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- Report type: 'summary', 'comparison', 'trend'
  report_type TEXT NOT NULL DEFAULT 'summary',

  -- Filter configuration (stored as JSON)
  filters JSONB NOT NULL DEFAULT '{}',
  -- Example filters structure:
  -- {
  --   "industries": ["saas", "fintech"],
  --   "stages": ["seed", "series_a"],
  --   "periodType": "monthly",
  --   "startDate": "2024-01-01",
  --   "endDate": "2024-12-31",
  --   "metrics": ["mrr", "burn rate"]
  -- }

  -- For comparison reports: selected company IDs
  company_ids UUID[] DEFAULT '{}',

  -- Comparison-specific settings
  normalize TEXT DEFAULT 'absolute', -- 'absolute', 'indexed', 'percentChange'

  -- Display preferences
  config JSONB NOT NULL DEFAULT '{}',
  -- Example config structure:
  -- {
  --   "showBenchmark": true,
  --   "chartType": "line",
  --   "selectedMetric": "mrr"
  -- }

  -- Sharing
  is_default BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by investor
CREATE INDEX idx_portfolio_reports_investor ON portfolio_reports(investor_id);

-- Index for finding default reports
CREATE INDEX idx_portfolio_reports_default ON portfolio_reports(investor_id, is_default) WHERE is_default = true;

-- Ensure only one default report per investor per report type
CREATE UNIQUE INDEX idx_portfolio_reports_unique_default
  ON portfolio_reports(investor_id, report_type)
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE portfolio_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Investors can view their own reports
CREATE POLICY "Investors can view own reports"
  ON portfolio_reports FOR SELECT
  TO authenticated
  USING (investor_id = auth.uid());

-- Investors can create their own reports
CREATE POLICY "Investors can create own reports"
  ON portfolio_reports FOR INSERT
  TO authenticated
  WITH CHECK (investor_id = auth.uid());

-- Investors can update their own reports
CREATE POLICY "Investors can update own reports"
  ON portfolio_reports FOR UPDATE
  TO authenticated
  USING (investor_id = auth.uid())
  WITH CHECK (investor_id = auth.uid());

-- Investors can delete their own reports
CREATE POLICY "Investors can delete own reports"
  ON portfolio_reports FOR DELETE
  TO authenticated
  USING (investor_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_portfolio_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portfolio_reports_updated_at
  BEFORE UPDATE ON portfolio_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_portfolio_reports_updated_at();

-- Function to clear other default reports when setting a new default
CREATE OR REPLACE FUNCTION clear_other_default_reports()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE portfolio_reports
    SET is_default = false
    WHERE investor_id = NEW.investor_id
      AND report_type = NEW.report_type
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clear_other_default_reports
  BEFORE INSERT OR UPDATE ON portfolio_reports
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION clear_other_default_reports();
