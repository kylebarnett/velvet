-- LP Reporting Module: funds, fund investments, and LP reports

CREATE TABLE funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  vintage_year INTEGER NOT NULL,
  fund_size NUMERIC,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE fund_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  invested_amount NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  realized_value NUMERIC DEFAULT 0,
  investment_date DATE,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE lp_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'quarterly',
  title TEXT NOT NULL,
  content JSONB DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE fund_investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lp_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investors_own_funds" ON funds FOR ALL USING (investor_id = auth.uid());
CREATE POLICY "investors_own_investments" ON fund_investments FOR ALL
  USING (fund_id IN (SELECT id FROM funds WHERE investor_id = auth.uid()));
CREATE POLICY "investors_own_lp_reports" ON lp_reports FOR ALL
  USING (fund_id IN (SELECT id FROM funds WHERE investor_id = auth.uid()));
