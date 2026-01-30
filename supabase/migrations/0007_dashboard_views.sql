-- 0007_dashboard_views.sql
-- Dashboard views and templates for investor metrics visualization
-- Supports drag-drop dashboard builder with saved layouts

-- ============================================================
-- 1. Dashboard Views (saved per investor per company)
-- ============================================================

CREATE TABLE public.dashboard_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  layout jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(investor_id, company_id, name)
);

-- Index for fast lookups
CREATE INDEX idx_dashboard_views_investor_company
  ON public.dashboard_views(investor_id, company_id);

-- Updated_at trigger
CREATE TRIGGER set_dashboard_views_updated_at
  BEFORE UPDATE ON public.dashboard_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. Dashboard Templates (system-wide presets)
-- ============================================================

CREATE TABLE public.dashboard_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  target_industry text,
  layout jsonb NOT NULL DEFAULT '[]',
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. RLS Policies
-- ============================================================

ALTER TABLE public.dashboard_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_templates ENABLE ROW LEVEL SECURITY;

-- Investors can manage their own views
CREATE POLICY "dashboard_views_investor_all"
  ON public.dashboard_views FOR ALL TO authenticated
  USING (investor_id = auth.uid())
  WITH CHECK (investor_id = auth.uid());

-- Anyone can read templates
CREATE POLICY "dashboard_templates_select"
  ON public.dashboard_templates FOR SELECT TO authenticated
  USING (true);

-- ============================================================
-- 4. Seed Dashboard Templates
-- Uses jsonb_build_object/jsonb_build_array to avoid JSON string escaping issues
-- ============================================================

-- SaaS Overview Template
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'SaaS Overview',
  'Key SaaS metrics including MRR, ARR, burn rate, and runway with trend visualization',
  'saas',
  jsonb_build_array(
    jsonb_build_object('id', 'card-mrr', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'MRR', 'showTrend', true, 'title', 'MRR')),
    jsonb_build_object('id', 'card-arr', 'type', 'metric-card', 'x', 3, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'ARR', 'showTrend', true, 'title', 'ARR')),
    jsonb_build_object('id', 'card-burn', 'type', 'metric-card', 'x', 6, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Burn Rate', 'showTrend', true, 'title', 'Burn Rate')),
    jsonb_build_object('id', 'card-runway', 'type', 'metric-card', 'x', 9, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Runway', 'showTrend', true, 'title', 'Runway')),
    jsonb_build_object('id', 'chart-revenue', 'type', 'chart', 'x', 0, 'y', 1, 'w', 8, 'h', 2, 'config', jsonb_build_object('chartType', 'line', 'metrics', jsonb_build_array('MRR', 'ARR'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'MRR & ARR Over Time')),
    jsonb_build_object('id', 'chart-ltv-cac', 'type', 'chart', 'x', 8, 'y', 1, 'w', 4, 'h', 2, 'config', jsonb_build_object('chartType', 'bar', 'metrics', jsonb_build_array('CAC', 'LTV'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'CAC vs LTV')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('MRR', 'ARR', 'Burn Rate', 'Runway', 'CAC', 'LTV', 'Gross Margin'), 'periodType', 'quarterly', 'title', 'All Metrics'))
  )
);

-- Fintech Overview Template
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'Fintech Overview',
  'Key fintech metrics including transaction volume, revenue, and take rate',
  'fintech',
  jsonb_build_array(
    jsonb_build_object('id', 'card-tpv', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Total Transaction Volume', 'showTrend', true, 'title', 'TPV')),
    jsonb_build_object('id', 'card-revenue', 'type', 'metric-card', 'x', 3, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Net Revenue', 'showTrend', true, 'title', 'Net Revenue')),
    jsonb_build_object('id', 'card-take', 'type', 'metric-card', 'x', 6, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Take Rate', 'showTrend', true, 'title', 'Take Rate')),
    jsonb_build_object('id', 'card-accounts', 'type', 'metric-card', 'x', 9, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Active Accounts', 'showTrend', true, 'title', 'Active Accounts')),
    jsonb_build_object('id', 'chart-volume', 'type', 'chart', 'x', 0, 'y', 1, 'w', 8, 'h', 2, 'config', jsonb_build_object('chartType', 'area', 'metrics', jsonb_build_array('Total Transaction Volume'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Transaction Volume Over Time')),
    jsonb_build_object('id', 'chart-revenue', 'type', 'chart', 'x', 8, 'y', 1, 'w', 4, 'h', 2, 'config', jsonb_build_object('chartType', 'line', 'metrics', jsonb_build_array('Net Revenue'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Revenue Trend')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('Total Transaction Volume', 'Net Revenue', 'Take Rate', 'Default Rate', 'Active Accounts', 'ARPU'), 'periodType', 'quarterly', 'title', 'All Metrics'))
  )
);

-- Financial Overview Template (General)
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'Financial Overview',
  'General financial metrics suitable for any company type',
  NULL,
  jsonb_build_array(
    jsonb_build_object('id', 'card-revenue', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 4, 'h', 1, 'config', jsonb_build_object('metric', 'Revenue', 'showTrend', true, 'title', 'Revenue')),
    jsonb_build_object('id', 'card-margin', 'type', 'metric-card', 'x', 4, 'y', 0, 'w', 4, 'h', 1, 'config', jsonb_build_object('metric', 'Gross Margin', 'showTrend', true, 'title', 'Gross Margin')),
    jsonb_build_object('id', 'card-burn', 'type', 'metric-card', 'x', 8, 'y', 0, 'w', 4, 'h', 1, 'config', jsonb_build_object('metric', 'Burn Rate', 'showTrend', true, 'title', 'Burn Rate')),
    jsonb_build_object('id', 'chart-revenue', 'type', 'chart', 'x', 0, 'y', 1, 'w', 12, 'h', 2, 'config', jsonb_build_object('chartType', 'area', 'metrics', jsonb_build_array('Revenue'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Revenue Over Time')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('Revenue', 'Gross Margin', 'Operating Expenses', 'Burn Rate', 'Runway'), 'periodType', 'quarterly', 'title', 'Financial Metrics'))
  )
);

-- Healthcare Overview Template
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'Healthcare Overview',
  'Key healthcare metrics including patient metrics and clinical outcomes',
  'healthcare',
  jsonb_build_array(
    jsonb_build_object('id', 'card-patients', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Monthly Active Patients', 'showTrend', true, 'title', 'Active Patients')),
    jsonb_build_object('id', 'card-revenue', 'type', 'metric-card', 'x', 3, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Revenue', 'showTrend', true, 'title', 'Revenue')),
    jsonb_build_object('id', 'card-retention', 'type', 'metric-card', 'x', 6, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Patient Retention Rate', 'showTrend', true, 'title', 'Retention Rate')),
    jsonb_build_object('id', 'card-nps', 'type', 'metric-card', 'x', 9, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'NPS', 'showTrend', true, 'title', 'NPS')),
    jsonb_build_object('id', 'chart-patients', 'type', 'chart', 'x', 0, 'y', 1, 'w', 8, 'h', 2, 'config', jsonb_build_object('chartType', 'line', 'metrics', jsonb_build_array('Monthly Active Patients'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Patient Growth')),
    jsonb_build_object('id', 'chart-outcomes', 'type', 'chart', 'x', 8, 'y', 1, 'w', 4, 'h', 2, 'config', jsonb_build_object('chartType', 'bar', 'metrics', jsonb_build_array('Clinical Outcomes Score'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Clinical Outcomes')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('Monthly Active Patients', 'Revenue', 'Cost Per Patient', 'Patient Retention Rate', 'Clinical Outcomes Score', 'NPS'), 'periodType', 'quarterly', 'title', 'All Metrics'))
  )
);

-- E-commerce Overview Template
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'E-commerce Overview',
  'Key e-commerce metrics including GMV, AOV, and conversion rates',
  'ecommerce',
  jsonb_build_array(
    jsonb_build_object('id', 'card-gmv', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'GMV', 'showTrend', true, 'title', 'GMV')),
    jsonb_build_object('id', 'card-revenue', 'type', 'metric-card', 'x', 3, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Net Revenue', 'showTrend', true, 'title', 'Net Revenue')),
    jsonb_build_object('id', 'card-aov', 'type', 'metric-card', 'x', 6, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'AOV', 'showTrend', true, 'title', 'AOV')),
    jsonb_build_object('id', 'card-conversion', 'type', 'metric-card', 'x', 9, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Conversion Rate', 'showTrend', true, 'title', 'Conversion Rate')),
    jsonb_build_object('id', 'chart-gmv', 'type', 'chart', 'x', 0, 'y', 1, 'w', 8, 'h', 2, 'config', jsonb_build_object('chartType', 'area', 'metrics', jsonb_build_array('GMV', 'Net Revenue'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'GMV & Revenue Over Time')),
    jsonb_build_object('id', 'chart-rates', 'type', 'chart', 'x', 8, 'y', 1, 'w', 4, 'h', 2, 'config', jsonb_build_object('chartType', 'line', 'metrics', jsonb_build_array('Conversion Rate', 'Return Rate'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Conversion & Return Rates')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('GMV', 'Net Revenue', 'AOV', 'CAC', 'LTV', 'Conversion Rate', 'Return Rate'), 'periodType', 'quarterly', 'title', 'All Metrics'))
  )
);

-- EdTech Overview Template
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'EdTech Overview',
  'Key EdTech metrics including learner engagement and completion rates',
  'edtech',
  jsonb_build_array(
    jsonb_build_object('id', 'card-learners', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Monthly Active Learners', 'showTrend', true, 'title', 'Active Learners')),
    jsonb_build_object('id', 'card-completion', 'type', 'metric-card', 'x', 3, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Course Completion Rate', 'showTrend', true, 'title', 'Completion Rate')),
    jsonb_build_object('id', 'card-revenue', 'type', 'metric-card', 'x', 6, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Revenue', 'showTrend', true, 'title', 'Revenue')),
    jsonb_build_object('id', 'card-retention', 'type', 'metric-card', 'x', 9, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Student Retention Rate', 'showTrend', true, 'title', 'Retention Rate')),
    jsonb_build_object('id', 'chart-learners', 'type', 'chart', 'x', 0, 'y', 1, 'w', 8, 'h', 2, 'config', jsonb_build_object('chartType', 'line', 'metrics', jsonb_build_array('Monthly Active Learners'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Learner Growth')),
    jsonb_build_object('id', 'chart-engagement', 'type', 'chart', 'x', 8, 'y', 1, 'w', 4, 'h', 2, 'config', jsonb_build_object('chartType', 'bar', 'metrics', jsonb_build_array('Course Completion Rate', 'Student Retention Rate'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Engagement Metrics')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('Monthly Active Learners', 'Course Completion Rate', 'Revenue', 'CAC', 'Student Retention Rate', 'NPS', 'ARPU'), 'periodType', 'quarterly', 'title', 'All Metrics'))
  )
);

-- AI/ML Overview Template
INSERT INTO public.dashboard_templates (name, description, target_industry, layout) VALUES (
  'AI/ML Overview',
  'Key AI/ML metrics including usage, compute costs, and model performance',
  'ai_ml',
  jsonb_build_array(
    jsonb_build_object('id', 'card-users', 'type', 'metric-card', 'x', 0, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Monthly Active Users', 'showTrend', true, 'title', 'Active Users')),
    jsonb_build_object('id', 'card-calls', 'type', 'metric-card', 'x', 3, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'API Calls', 'showTrend', true, 'title', 'API Calls')),
    jsonb_build_object('id', 'card-revenue', 'type', 'metric-card', 'x', 6, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Revenue', 'showTrend', true, 'title', 'Revenue')),
    jsonb_build_object('id', 'card-margin', 'type', 'metric-card', 'x', 9, 'y', 0, 'w', 3, 'h', 1, 'config', jsonb_build_object('metric', 'Gross Margin', 'showTrend', true, 'title', 'Gross Margin')),
    jsonb_build_object('id', 'chart-usage', 'type', 'chart', 'x', 0, 'y', 1, 'w', 8, 'h', 2, 'config', jsonb_build_object('chartType', 'area', 'metrics', jsonb_build_array('API Calls'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'API Usage Over Time')),
    jsonb_build_object('id', 'chart-costs', 'type', 'chart', 'x', 8, 'y', 1, 'w', 4, 'h', 2, 'config', jsonb_build_object('chartType', 'bar', 'metrics', jsonb_build_array('Compute Costs', 'Revenue'), 'periodType', 'quarterly', 'showLegend', true, 'title', 'Revenue vs Compute Costs')),
    jsonb_build_object('id', 'table-metrics', 'type', 'table', 'x', 0, 'y', 3, 'w', 12, 'h', 2, 'config', jsonb_build_object('metrics', jsonb_build_array('Monthly Active Users', 'API Calls', 'Revenue', 'Compute Costs', 'Gross Margin', 'Model Accuracy', 'Inference Latency'), 'periodType', 'quarterly', 'title', 'All Metrics'))
  )
);
