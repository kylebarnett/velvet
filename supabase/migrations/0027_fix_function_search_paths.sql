-- Fix "Function Search Path Mutable" warnings from Supabase linter.
-- Setting search_path = '' on all public functions prevents search path injection attacks.
-- Functions that need to reference public tables use fully-qualified names (public.table_name).

-- 1. set_updated_at (trigger function, used across many tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. current_user_role (used in RLS policies)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$;

-- 3. update_portfolio_reports_updated_at (trigger)
CREATE OR REPLACE FUNCTION public.update_portfolio_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. clear_other_default_reports (trigger)
CREATE OR REPLACE FUNCTION public.clear_other_default_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.portfolio_reports
    SET is_default = false
    WHERE investor_id = NEW.investor_id
      AND report_type = NEW.report_type
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. calculate_next_run_date (pure function)
CREATE OR REPLACE FUNCTION public.calculate_next_run_date(
  p_cadence public.schedule_cadence,
  p_day_of_month INTEGER,
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_next_date DATE;
  v_current_date DATE := p_from_date::DATE;
  v_target_month INTEGER;
  v_target_year INTEGER;
BEGIN
  CASE p_cadence
    WHEN 'monthly' THEN
      IF EXTRACT(DAY FROM v_current_date) < p_day_of_month THEN
        v_target_month := EXTRACT(MONTH FROM v_current_date);
        v_target_year := EXTRACT(YEAR FROM v_current_date);
      ELSE
        v_target_month := EXTRACT(MONTH FROM v_current_date) + 1;
        v_target_year := EXTRACT(YEAR FROM v_current_date);
        IF v_target_month > 12 THEN
          v_target_month := 1;
          v_target_year := v_target_year + 1;
        END IF;
      END IF;

    WHEN 'quarterly' THEN
      v_target_month := (FLOOR((EXTRACT(MONTH FROM v_current_date) - 1) / 3) * 3) + 4;
      v_target_year := EXTRACT(YEAR FROM v_current_date);
      IF v_target_month > 12 THEN
        v_target_month := 1;
        v_target_year := v_target_year + 1;
      END IF;
      IF EXTRACT(MONTH FROM v_current_date) IN (1, 4, 7, 10)
         AND EXTRACT(DAY FROM v_current_date) < p_day_of_month THEN
        v_target_month := EXTRACT(MONTH FROM v_current_date);
        v_target_year := EXTRACT(YEAR FROM v_current_date);
      END IF;

    WHEN 'annual' THEN
      v_target_month := 1;
      v_target_year := EXTRACT(YEAR FROM v_current_date) + 1;
      IF EXTRACT(MONTH FROM v_current_date) = 1
         AND EXTRACT(DAY FROM v_current_date) < p_day_of_month THEN
        v_target_year := EXTRACT(YEAR FROM v_current_date);
      END IF;
  END CASE;

  v_next_date := make_date(
    v_target_year::INTEGER,
    v_target_month::INTEGER,
    LEAST(p_day_of_month, EXTRACT(DAY FROM (make_date(v_target_year::INTEGER, v_target_month::INTEGER, 1) + INTERVAL '1 month - 1 day')::DATE))::INTEGER
  );

  RETURN v_next_date::TIMESTAMPTZ + INTERVAL '6 hours';
END;
$$;

-- 6. calculate_reporting_period (pure function)
CREATE OR REPLACE FUNCTION public.calculate_reporting_period(
  p_cadence public.schedule_cadence,
  p_run_date DATE
)
RETURNS TABLE(period_start DATE, period_end DATE)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  CASE p_cadence
    WHEN 'monthly' THEN
      v_period_start := DATE_TRUNC('month', p_run_date - INTERVAL '1 month')::DATE;
      v_period_end := (DATE_TRUNC('month', p_run_date) - INTERVAL '1 day')::DATE;

    WHEN 'quarterly' THEN
      v_period_start := DATE_TRUNC('quarter', p_run_date - INTERVAL '3 months')::DATE;
      v_period_end := (DATE_TRUNC('quarter', p_run_date) - INTERVAL '1 day')::DATE;

    WHEN 'annual' THEN
      v_period_start := DATE_TRUNC('year', p_run_date - INTERVAL '1 year')::DATE;
      v_period_end := (DATE_TRUNC('year', p_run_date) - INTERVAL '1 day')::DATE;
  END CASE;

  RETURN QUERY SELECT v_period_start, v_period_end;
END;
$$;

-- 7. set_initial_next_run (trigger)
CREATE OR REPLACE FUNCTION public.set_initial_next_run()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.next_run_at IS NULL AND NEW.is_active = true THEN
    NEW.next_run_at := public.calculate_next_run_date(NEW.cadence, NEW.day_of_month);
  END IF;
  RETURN NEW;
END;
$$;

-- 8. enforce_founder_relationship_update (SECURITY DEFINER trigger)
CREATE OR REPLACE FUNCTION public.enforce_founder_relationship_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text;
BEGIN
  SELECT raw_user_meta_data ->> 'role' INTO caller_role
  FROM auth.users WHERE id = auth.uid();

  IF caller_role = 'founder' THEN
    IF NEW.investor_id IS DISTINCT FROM OLD.investor_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.is_inviting_investor IS DISTINCT FROM OLD.is_inviting_investor
    THEN
      RAISE EXCEPTION 'Founders may only update approval_status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 9. user_org_members (SECURITY DEFINER, used in RLS)
CREATE OR REPLACE FUNCTION public.user_org_members()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (
      SELECT array_agg(distinct om2.user_id)
      FROM public.organization_members om1
      JOIN public.organization_members om2
        ON om2.organization_id = om1.organization_id
      WHERE om1.user_id = auth.uid()
    ),
    array[auth.uid()]
  );
$$;

-- 10. user_organization_ids (SECURITY DEFINER, used in RLS)
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    array_agg(organization_id),
    array[]::uuid[]
  )
  FROM public.organization_members
  WHERE user_id = auth.uid();
$$;

-- 11. delete_user_by_email (may have been created via SQL editor; fix if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'delete_user_by_email'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    EXECUTE 'ALTER FUNCTION public.delete_user_by_email SET search_path = ''''';
  END IF;
END;
$$;
