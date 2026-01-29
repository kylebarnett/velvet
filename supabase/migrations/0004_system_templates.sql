-- 0004_system_templates.sql
-- Pre-built industry-standard metric templates
-- System templates are read-only and shared across all investors
-- Investors can clone system templates to create their own customized versions

-- ============================================================
-- 1. Schema Changes
-- ============================================================

-- Add is_system flag to identify system templates
ALTER TABLE public.metric_templates
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

-- Add target_industry to match templates with company tags
ALTER TABLE public.metric_templates
  ADD COLUMN IF NOT EXISTS target_industry text;

-- Make investor_id nullable for system templates
ALTER TABLE public.metric_templates
  ALTER COLUMN investor_id DROP NOT NULL;

-- Add constraint: system templates have no investor_id, user templates require investor_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'metric_templates_ownership_check'
  ) THEN
    ALTER TABLE public.metric_templates
      ADD CONSTRAINT metric_templates_ownership_check
      CHECK (
        (is_system = true AND investor_id IS NULL)
        OR (is_system = false AND investor_id IS NOT NULL)
      );
  END IF;
END $$;

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_metric_templates_is_system
  ON public.metric_templates(is_system);

CREATE INDEX IF NOT EXISTS idx_metric_templates_target_industry
  ON public.metric_templates(target_industry) WHERE target_industry IS NOT NULL;

-- ============================================================
-- 3. RLS Policy Updates
-- ============================================================

-- Drop existing policy
DROP POLICY IF EXISTS "metric_templates_investor_crud" ON public.metric_templates;

-- System templates: any authenticated investor can SELECT (read-only)
CREATE POLICY "metric_templates_system_select"
ON public.metric_templates FOR SELECT TO authenticated
USING (
  is_system = true
  AND public.current_user_role() = 'investor'
);

-- User templates: investor can CRUD their own templates
CREATE POLICY "metric_templates_user_crud"
ON public.metric_templates FOR ALL TO authenticated
USING (
  is_system = false
  AND investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
)
WITH CHECK (
  is_system = false
  AND investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
);

-- Update metric_template_items RLS to allow reading items for system templates
DROP POLICY IF EXISTS "metric_template_items_investor_crud" ON public.metric_template_items;

-- System template items: read-only for all investors
CREATE POLICY "metric_template_items_system_select"
ON public.metric_template_items FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metric_templates t
    WHERE t.id = metric_template_items.template_id
    AND t.is_system = true
  )
  AND public.current_user_role() = 'investor'
);

-- User template items: full CRUD for owner
CREATE POLICY "metric_template_items_user_crud"
ON public.metric_template_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metric_templates t
    WHERE t.id = metric_template_items.template_id
    AND t.is_system = false
    AND t.investor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metric_templates t
    WHERE t.id = metric_template_items.template_id
    AND t.is_system = false
    AND t.investor_id = auth.uid()
  )
);

-- ============================================================
-- 4. Seed System Templates
-- ============================================================

-- Using deterministic UUIDs for idempotent seeding
-- SaaS:      00000000-0000-0000-0001-000000000001
-- Fintech:   00000000-0000-0000-0001-000000000002
-- Healthcare:00000000-0000-0000-0001-000000000003
-- E-commerce:00000000-0000-0000-0001-000000000004
-- EdTech:    00000000-0000-0000-0001-000000000005
-- AI/ML:     00000000-0000-0000-0001-000000000006
-- General:   00000000-0000-0000-0001-000000000007

-- Insert system templates
INSERT INTO public.metric_templates (id, is_system, target_industry, name, description)
VALUES
  ('00000000-0000-0000-0001-000000000001', true, 'saas', 'SaaS Metrics',
   'Standard metrics for SaaS businesses including MRR, ARR, churn, retention, and growth metrics.'),
  ('00000000-0000-0000-0001-000000000002', true, 'fintech', 'Fintech Metrics',
   'Key performance indicators for fintech companies including transaction volume, take rate, and risk metrics.'),
  ('00000000-0000-0000-0001-000000000003', true, 'healthcare', 'Healthcare Metrics',
   'Healthcare industry metrics including patient engagement, clinical outcomes, and compliance indicators.'),
  ('00000000-0000-0000-0001-000000000004', true, 'ecommerce', 'E-commerce Metrics',
   'E-commerce performance metrics including GMV, AOV, conversion rates, and customer lifetime value.'),
  ('00000000-0000-0000-0001-000000000005', true, 'edtech', 'EdTech Metrics',
   'Education technology metrics including learner engagement, completion rates, and learning outcomes.'),
  ('00000000-0000-0000-0001-000000000006', true, 'ai_ml', 'AI/ML Metrics',
   'AI and machine learning company metrics including usage, model performance, and compute efficiency.'),
  ('00000000-0000-0000-0001-000000000007', true, 'other', 'General Metrics',
   'Fundamental business metrics applicable to any industry including revenue, margins, and burn rate.')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. Seed Template Items
-- ============================================================

-- SaaS Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'MRR', 'monthly', 'currency', 0),
  ('00000000-0000-0000-0001-000000000001', 'ARR', 'annual', 'currency', 1),
  ('00000000-0000-0000-0001-000000000001', 'Net Revenue Retention', 'monthly', 'percentage', 2),
  ('00000000-0000-0000-0001-000000000001', 'Gross Revenue Retention', 'monthly', 'percentage', 3),
  ('00000000-0000-0000-0001-000000000001', 'Customer Churn Rate', 'monthly', 'percentage', 4),
  ('00000000-0000-0000-0001-000000000001', 'CAC', 'monthly', 'currency', 5),
  ('00000000-0000-0000-0001-000000000001', 'LTV', 'monthly', 'currency', 6),
  ('00000000-0000-0000-0001-000000000001', 'LTV:CAC Ratio', 'monthly', 'number', 7),
  ('00000000-0000-0000-0001-000000000001', 'Burn Rate', 'monthly', 'currency', 8),
  ('00000000-0000-0000-0001-000000000001', 'Runway', 'monthly', 'number', 9),
  ('00000000-0000-0000-0001-000000000001', 'Gross Margin', 'monthly', 'percentage', 10),
  ('00000000-0000-0000-0001-000000000001', 'Active Users', 'monthly', 'number', 11)
ON CONFLICT DO NOTHING;

-- Fintech Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000002', 'Total Transaction Volume', 'monthly', 'currency', 0),
  ('00000000-0000-0000-0001-000000000002', 'Net Revenue', 'monthly', 'currency', 1),
  ('00000000-0000-0000-0001-000000000002', 'Take Rate', 'monthly', 'percentage', 2),
  ('00000000-0000-0000-0001-000000000002', 'Default Rate', 'monthly', 'percentage', 3),
  ('00000000-0000-0000-0001-000000000002', 'Active Accounts', 'monthly', 'number', 4),
  ('00000000-0000-0000-0001-000000000002', 'Customer Acquisition Cost', 'monthly', 'currency', 5),
  ('00000000-0000-0000-0001-000000000002', 'Average Revenue Per User', 'monthly', 'currency', 6),
  ('00000000-0000-0000-0001-000000000002', 'Fraud Rate', 'monthly', 'percentage', 7),
  ('00000000-0000-0000-0001-000000000002', 'Regulatory Capital Ratio', 'quarterly', 'percentage', 8),
  ('00000000-0000-0000-0001-000000000002', 'Net Interest Margin', 'monthly', 'percentage', 9)
ON CONFLICT DO NOTHING;

-- Healthcare Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000003', 'Monthly Active Patients', 'monthly', 'number', 0),
  ('00000000-0000-0000-0001-000000000003', 'Revenue', 'monthly', 'currency', 1),
  ('00000000-0000-0000-0001-000000000003', 'Cost Per Patient', 'monthly', 'currency', 2),
  ('00000000-0000-0000-0001-000000000003', 'Patient Retention Rate', 'monthly', 'percentage', 3),
  ('00000000-0000-0000-0001-000000000003', 'Clinical Outcomes Score', 'quarterly', 'number', 4),
  ('00000000-0000-0000-0001-000000000003', 'Provider Utilization Rate', 'monthly', 'percentage', 5),
  ('00000000-0000-0000-0001-000000000003', 'Claims Processing Time', 'monthly', 'number', 6),
  ('00000000-0000-0000-0001-000000000003', 'Net Promoter Score', 'quarterly', 'number', 7),
  ('00000000-0000-0000-0001-000000000003', 'HIPAA Compliance Score', 'quarterly', 'percentage', 8),
  ('00000000-0000-0000-0001-000000000003', 'Gross Margin', 'monthly', 'percentage', 9)
ON CONFLICT DO NOTHING;

-- E-commerce Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000004', 'Gross Merchandise Value', 'monthly', 'currency', 0),
  ('00000000-0000-0000-0001-000000000004', 'Net Revenue', 'monthly', 'currency', 1),
  ('00000000-0000-0000-0001-000000000004', 'Average Order Value', 'monthly', 'currency', 2),
  ('00000000-0000-0000-0001-000000000004', 'Customer Acquisition Cost', 'monthly', 'currency', 3),
  ('00000000-0000-0000-0001-000000000004', 'Customer Lifetime Value', 'monthly', 'currency', 4),
  ('00000000-0000-0000-0001-000000000004', 'Conversion Rate', 'monthly', 'percentage', 5),
  ('00000000-0000-0000-0001-000000000004', 'Return Rate', 'monthly', 'percentage', 6),
  ('00000000-0000-0000-0001-000000000004', 'Cart Abandonment Rate', 'monthly', 'percentage', 7),
  ('00000000-0000-0000-0001-000000000004', 'Inventory Turnover', 'monthly', 'number', 8),
  ('00000000-0000-0000-0001-000000000004', 'Repeat Purchase Rate', 'monthly', 'percentage', 9)
ON CONFLICT DO NOTHING;

-- EdTech Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000005', 'Monthly Active Learners', 'monthly', 'number', 0),
  ('00000000-0000-0000-0001-000000000005', 'Course Completion Rate', 'monthly', 'percentage', 1),
  ('00000000-0000-0000-0001-000000000005', 'Revenue', 'monthly', 'currency', 2),
  ('00000000-0000-0000-0001-000000000005', 'Customer Acquisition Cost', 'monthly', 'currency', 3),
  ('00000000-0000-0000-0001-000000000005', 'Student Retention Rate', 'monthly', 'percentage', 4),
  ('00000000-0000-0000-0001-000000000005', 'Net Promoter Score', 'quarterly', 'number', 5),
  ('00000000-0000-0000-0001-000000000005', 'Average Revenue Per User', 'monthly', 'currency', 6),
  ('00000000-0000-0000-0001-000000000005', 'Content Engagement Time', 'monthly', 'number', 7),
  ('00000000-0000-0000-0001-000000000005', 'Instructor Satisfaction Score', 'quarterly', 'number', 8),
  ('00000000-0000-0000-0001-000000000005', 'Learning Outcome Improvement', 'quarterly', 'percentage', 9)
ON CONFLICT DO NOTHING;

-- AI/ML Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000006', 'Monthly Active Users', 'monthly', 'number', 0),
  ('00000000-0000-0000-0001-000000000006', 'API Calls', 'monthly', 'number', 1),
  ('00000000-0000-0000-0001-000000000006', 'Revenue', 'monthly', 'currency', 2),
  ('00000000-0000-0000-0001-000000000006', 'Compute Costs', 'monthly', 'currency', 3),
  ('00000000-0000-0000-0001-000000000006', 'Gross Margin', 'monthly', 'percentage', 4),
  ('00000000-0000-0000-0001-000000000006', 'Model Accuracy', 'monthly', 'percentage', 5),
  ('00000000-0000-0000-0001-000000000006', 'Inference Latency', 'monthly', 'number', 6),
  ('00000000-0000-0000-0001-000000000006', 'Customer Churn Rate', 'monthly', 'percentage', 7),
  ('00000000-0000-0000-0001-000000000006', 'Usage Growth Rate', 'monthly', 'percentage', 8),
  ('00000000-0000-0000-0001-000000000006', 'Data Processing Volume', 'monthly', 'number', 9)
ON CONFLICT DO NOTHING;

-- General Metrics
INSERT INTO public.metric_template_items (template_id, metric_name, period_type, data_type, sort_order)
VALUES
  ('00000000-0000-0000-0001-000000000007', 'Revenue', 'monthly', 'currency', 0),
  ('00000000-0000-0000-0001-000000000007', 'Gross Margin', 'monthly', 'percentage', 1),
  ('00000000-0000-0000-0001-000000000007', 'Operating Expenses', 'monthly', 'currency', 2),
  ('00000000-0000-0000-0001-000000000007', 'Burn Rate', 'monthly', 'currency', 3),
  ('00000000-0000-0000-0001-000000000007', 'Runway', 'monthly', 'number', 4),
  ('00000000-0000-0000-0001-000000000007', 'Headcount', 'monthly', 'number', 5),
  ('00000000-0000-0000-0001-000000000007', 'Customer Count', 'monthly', 'number', 6),
  ('00000000-0000-0000-0001-000000000007', 'Customer Acquisition Cost', 'monthly', 'currency', 7)
ON CONFLICT DO NOTHING;
