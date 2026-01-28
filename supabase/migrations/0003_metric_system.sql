-- 0003_metric_system.sql
-- Multi-investor support, founder approval, company-level submissions, tags, templates

-- ============================================================
-- 1. ALTER existing tables
-- ============================================================

-- Companies: add tags + founder_email for dedup
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS business_model text;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS founder_email text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_founder_email_unique
  ON public.companies(founder_email) WHERE founder_email IS NOT NULL;

-- Make founder_id nullable (investors create companies without a founder)
ALTER TABLE public.companies ALTER COLUMN founder_id DROP NOT NULL;

-- Relationships: add approval tracking
ALTER TABLE public.investor_company_relationships
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('auto_approved', 'pending', 'approved', 'denied'));

ALTER TABLE public.investor_company_relationships
  ADD COLUMN IF NOT EXISTS is_inviting_investor boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. New tables
-- ============================================================

-- metric_templates — Investor's saved metric sets
CREATE TABLE IF NOT EXISTS public.metric_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS metric_templates_set_updated_at ON public.metric_templates;
CREATE TRIGGER metric_templates_set_updated_at
BEFORE UPDATE ON public.metric_templates
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- metric_template_items — Individual metrics in a template
CREATE TABLE IF NOT EXISTS public.metric_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.metric_templates(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  period_type public.period_type NOT NULL,
  data_type text NOT NULL DEFAULT 'number',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- company_metric_values — Shared submissions (company-level)
CREATE TABLE IF NOT EXISTS public.company_metric_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  metric_name text NOT NULL,
  period_type public.period_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  value jsonb NOT NULL,
  submitted_by uuid NOT NULL REFERENCES public.users(id),
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, metric_name, period_type, period_start, period_end)
);

DROP TRIGGER IF EXISTS company_metric_values_set_updated_at ON public.company_metric_values;
CREATE TRIGGER company_metric_values_set_updated_at
BEFORE UPDATE ON public.company_metric_values
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- 3. Auto-fulfill trigger
-- ============================================================
-- When a company_metric_value is inserted or updated, auto-mark matching
-- metric_requests as "submitted" (only for approved investors).

CREATE OR REPLACE FUNCTION public.auto_fulfill_metric_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.metric_requests mr
  SET status = 'submitted', updated_at = now()
  FROM public.metric_definitions md,
       public.investor_company_relationships icr
  WHERE mr.metric_definition_id = md.id
    AND mr.company_id = NEW.company_id
    AND lower(md.name) = lower(NEW.metric_name)
    AND md.period_type = NEW.period_type
    AND mr.period_start = NEW.period_start
    AND mr.period_end = NEW.period_end
    AND mr.status = 'pending'
    AND icr.investor_id = mr.investor_id
    AND icr.company_id = mr.company_id
    AND icr.approval_status IN ('auto_approved', 'approved');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_fulfill_metric_requests ON public.company_metric_values;
CREATE TRIGGER trg_auto_fulfill_metric_requests
AFTER INSERT OR UPDATE ON public.company_metric_values
FOR EACH ROW EXECUTE PROCEDURE public.auto_fulfill_metric_requests();

-- ============================================================
-- 4. RLS policies for new tables
-- ============================================================

ALTER TABLE public.metric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_metric_values ENABLE ROW LEVEL SECURITY;

-- metric_templates: investor CRUD own
DROP POLICY IF EXISTS "metric_templates_investor_crud" ON public.metric_templates;
CREATE POLICY "metric_templates_investor_crud"
ON public.metric_templates FOR ALL TO authenticated
USING (investor_id = auth.uid() AND public.current_user_role() = 'investor')
WITH CHECK (investor_id = auth.uid() AND public.current_user_role() = 'investor');

-- metric_template_items: investor CRUD via template ownership
DROP POLICY IF EXISTS "metric_template_items_investor_crud" ON public.metric_template_items;
CREATE POLICY "metric_template_items_investor_crud"
ON public.metric_template_items FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metric_templates t
    WHERE t.id = metric_template_items.template_id
    AND t.investor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.metric_templates t
    WHERE t.id = metric_template_items.template_id
    AND t.investor_id = auth.uid()
  )
);

-- company_metric_values: founder INSERT/UPDATE for own company
DROP POLICY IF EXISTS "company_metric_values_founder_write" ON public.company_metric_values;
CREATE POLICY "company_metric_values_founder_write"
ON public.company_metric_values FOR INSERT TO authenticated
WITH CHECK (
  submitted_by = auth.uid()
  AND public.current_user_role() = 'founder'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_metric_values.company_id AND c.founder_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "company_metric_values_founder_update" ON public.company_metric_values;
CREATE POLICY "company_metric_values_founder_update"
ON public.company_metric_values FOR UPDATE TO authenticated
USING (
  submitted_by = auth.uid()
  AND public.current_user_role() = 'founder'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_metric_values.company_id AND c.founder_id = auth.uid()
  )
)
WITH CHECK (
  submitted_by = auth.uid()
  AND public.current_user_role() = 'founder'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_metric_values.company_id AND c.founder_id = auth.uid()
  )
);

-- company_metric_values: founder can SELECT own company values
DROP POLICY IF EXISTS "company_metric_values_founder_select" ON public.company_metric_values;
CREATE POLICY "company_metric_values_founder_select"
ON public.company_metric_values FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = company_metric_values.company_id AND c.founder_id = auth.uid()
  )
);

-- company_metric_values: approved investors can SELECT
DROP POLICY IF EXISTS "company_metric_values_investor_select" ON public.company_metric_values;
CREATE POLICY "company_metric_values_investor_select"
ON public.company_metric_values FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.investor_company_relationships icr
    WHERE icr.company_id = company_metric_values.company_id
    AND icr.investor_id = auth.uid()
    AND icr.approval_status IN ('auto_approved', 'approved')
  )
);

-- ============================================================
-- 5. Updated RLS policies for existing tables
-- ============================================================

-- metric_requests SELECT: founders only see requests from approved investors
DROP POLICY IF EXISTS "metric_requests_select_investor_or_founder" ON public.metric_requests;
CREATE POLICY "metric_requests_select_investor_or_founder"
ON public.metric_requests FOR SELECT TO authenticated
USING (
  investor_id = auth.uid()
  OR (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = metric_requests.company_id AND c.founder_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.investor_company_relationships icr
      WHERE icr.investor_id = metric_requests.investor_id
      AND icr.company_id = metric_requests.company_id
      AND icr.approval_status IN ('auto_approved', 'approved')
    )
  )
);

-- investor_company_relationships: founders can UPDATE approval_status for their company
DROP POLICY IF EXISTS "relationships_founder_update_approval" ON public.investor_company_relationships;
CREATE POLICY "relationships_founder_update_approval"
ON public.investor_company_relationships FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = investor_company_relationships.company_id AND c.founder_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = investor_company_relationships.company_id AND c.founder_id = auth.uid()
  )
);

-- companies: founders can update their own company (for tags)
DROP POLICY IF EXISTS "companies_founder_update" ON public.companies;
CREATE POLICY "companies_founder_update"
ON public.companies FOR UPDATE TO authenticated
USING (founder_id = auth.uid())
WITH CHECK (founder_id = auth.uid());

-- ============================================================
-- 6. Indexes for performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_company_metric_values_company
  ON public.company_metric_values(company_id);
CREATE INDEX IF NOT EXISTS idx_company_metric_values_lookup
  ON public.company_metric_values(company_id, metric_name, period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_metric_templates_investor
  ON public.metric_templates(investor_id);
CREATE INDEX IF NOT EXISTS idx_metric_template_items_template
  ON public.metric_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_icr_approval_status
  ON public.investor_company_relationships(company_id, approval_status);
CREATE INDEX IF NOT EXISTS idx_companies_founder_email
  ON public.companies(founder_email);
