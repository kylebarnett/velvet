-- 0010_metric_request_schedules.sql
-- Scheduled metric requests: recurring request configurations, run history, and reminders

-- ============================================================
-- 1. Create schedule cadence enum
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.schedule_cadence AS ENUM ('monthly', 'quarterly', 'annual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.schedule_run_status AS ENUM ('success', 'partial', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.reminder_status AS ENUM ('pending', 'sent', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. metric_request_schedules table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.metric_request_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.metric_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,

  -- Scheduling configuration
  cadence public.schedule_cadence NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),

  -- Company targeting
  company_ids UUID[] DEFAULT NULL, -- NULL means all portfolio companies
  include_future_companies BOOLEAN NOT NULL DEFAULT false,

  -- Due date configuration
  due_days_offset INTEGER NOT NULL DEFAULT 7 CHECK (due_days_offset >= 1 AND due_days_offset <= 90),

  -- Reminder configuration
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before_due INTEGER[] NOT NULL DEFAULT ARRAY[3, 1],

  -- State tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metric_request_schedules_investor
  ON public.metric_request_schedules(investor_id);
CREATE INDEX IF NOT EXISTS idx_metric_request_schedules_next_run
  ON public.metric_request_schedules(next_run_at)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_metric_request_schedules_template
  ON public.metric_request_schedules(template_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS metric_request_schedules_set_updated_at ON public.metric_request_schedules;
CREATE TRIGGER metric_request_schedules_set_updated_at
BEFORE UPDATE ON public.metric_request_schedules
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- 3. scheduled_request_runs table (audit log)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scheduled_request_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.metric_request_schedules(id) ON DELETE CASCADE,

  -- Execution details
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Results
  requests_created INTEGER NOT NULL DEFAULT 0,
  emails_sent INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]',
  status public.schedule_run_status NOT NULL DEFAULT 'success',

  -- Company details for the run
  company_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scheduled_request_runs_schedule
  ON public.scheduled_request_runs(schedule_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_request_runs_run_at
  ON public.scheduled_request_runs(run_at DESC);

-- ============================================================
-- 4. metric_request_reminders table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.metric_request_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_request_id UUID NOT NULL REFERENCES public.metric_requests(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.metric_request_schedules(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,

  -- State tracking
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  status public.reminder_status NOT NULL DEFAULT 'pending',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metric_request_reminders_scheduled
  ON public.metric_request_reminders(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_metric_request_reminders_request
  ON public.metric_request_reminders(metric_request_id);

-- ============================================================
-- 5. Add schedule_id to metric_requests for tracking
-- ============================================================

ALTER TABLE public.metric_requests
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.metric_request_schedules(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_metric_requests_schedule
  ON public.metric_requests(schedule_id)
  WHERE schedule_id IS NOT NULL;

-- ============================================================
-- 6. Trigger to cancel reminders on submission
-- ============================================================

CREATE OR REPLACE FUNCTION public.cancel_reminders_on_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- When a metric request status changes to 'submitted', cancel pending reminders
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    UPDATE public.metric_request_reminders
    SET
      status = 'cancelled',
      cancelled_at = NOW()
    WHERE metric_request_id = NEW.id
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cancel_reminders_on_submission ON public.metric_requests;
CREATE TRIGGER trg_cancel_reminders_on_submission
AFTER UPDATE ON public.metric_requests
FOR EACH ROW
WHEN (NEW.status = 'submitted')
EXECUTE FUNCTION public.cancel_reminders_on_submission();

-- ============================================================
-- 7. RLS Policies
-- ============================================================

ALTER TABLE public.metric_request_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_request_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_request_reminders ENABLE ROW LEVEL SECURITY;

-- metric_request_schedules: investor CRUD own
DROP POLICY IF EXISTS "schedules_investor_select" ON public.metric_request_schedules;
CREATE POLICY "schedules_investor_select"
ON public.metric_request_schedules FOR SELECT
TO authenticated
USING (investor_id = auth.uid());

DROP POLICY IF EXISTS "schedules_investor_insert" ON public.metric_request_schedules;
CREATE POLICY "schedules_investor_insert"
ON public.metric_request_schedules FOR INSERT
TO authenticated
WITH CHECK (
  investor_id = auth.uid()
  AND public.current_user_role() = 'investor'
);

DROP POLICY IF EXISTS "schedules_investor_update" ON public.metric_request_schedules;
CREATE POLICY "schedules_investor_update"
ON public.metric_request_schedules FOR UPDATE
TO authenticated
USING (investor_id = auth.uid() AND public.current_user_role() = 'investor')
WITH CHECK (investor_id = auth.uid() AND public.current_user_role() = 'investor');

DROP POLICY IF EXISTS "schedules_investor_delete" ON public.metric_request_schedules;
CREATE POLICY "schedules_investor_delete"
ON public.metric_request_schedules FOR DELETE
TO authenticated
USING (investor_id = auth.uid() AND public.current_user_role() = 'investor');

-- scheduled_request_runs: investor can view runs for their schedules
DROP POLICY IF EXISTS "runs_investor_select" ON public.scheduled_request_runs;
CREATE POLICY "runs_investor_select"
ON public.scheduled_request_runs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metric_request_schedules s
    WHERE s.id = scheduled_request_runs.schedule_id
    AND s.investor_id = auth.uid()
  )
);

-- metric_request_reminders: investor can view reminders for their requests
DROP POLICY IF EXISTS "reminders_investor_select" ON public.metric_request_reminders;
CREATE POLICY "reminders_investor_select"
ON public.metric_request_reminders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metric_requests r
    WHERE r.id = metric_request_reminders.metric_request_id
    AND r.investor_id = auth.uid()
  )
);

-- Founders can view reminders for requests to their company
DROP POLICY IF EXISTS "reminders_founder_select" ON public.metric_request_reminders;
CREATE POLICY "reminders_founder_select"
ON public.metric_request_reminders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.metric_requests r
    JOIN public.companies c ON c.id = r.company_id
    WHERE r.id = metric_request_reminders.metric_request_id
    AND c.founder_id = auth.uid()
  )
);

-- ============================================================
-- 8. Function to calculate next run date
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_next_run_date(
  p_cadence public.schedule_cadence,
  p_day_of_month INTEGER,
  p_from_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_next_date DATE;
  v_current_date DATE := p_from_date::DATE;
  v_target_month INTEGER;
  v_target_year INTEGER;
BEGIN
  -- Get the start of next period based on cadence
  CASE p_cadence
    WHEN 'monthly' THEN
      -- Next month, or this month if day hasn't passed
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
      -- Next quarter start (Jan, Apr, Jul, Oct)
      v_target_month := (FLOOR((EXTRACT(MONTH FROM v_current_date) - 1) / 3) * 3) + 4;
      v_target_year := EXTRACT(YEAR FROM v_current_date);
      IF v_target_month > 12 THEN
        v_target_month := 1;
        v_target_year := v_target_year + 1;
      END IF;
      -- If we're in the first month of a quarter and haven't passed the day, use current quarter
      IF EXTRACT(MONTH FROM v_current_date) IN (1, 4, 7, 10)
         AND EXTRACT(DAY FROM v_current_date) < p_day_of_month THEN
        v_target_month := EXTRACT(MONTH FROM v_current_date);
        v_target_year := EXTRACT(YEAR FROM v_current_date);
      END IF;

    WHEN 'annual' THEN
      -- Next January
      v_target_month := 1;
      v_target_year := EXTRACT(YEAR FROM v_current_date) + 1;
      -- If we're in January and haven't passed the day, use this year
      IF EXTRACT(MONTH FROM v_current_date) = 1
         AND EXTRACT(DAY FROM v_current_date) < p_day_of_month THEN
        v_target_year := EXTRACT(YEAR FROM v_current_date);
      END IF;
  END CASE;

  -- Construct the date (clamping day to month's max days)
  v_next_date := make_date(
    v_target_year::INTEGER,
    v_target_month::INTEGER,
    LEAST(p_day_of_month, EXTRACT(DAY FROM (make_date(v_target_year::INTEGER, v_target_month::INTEGER, 1) + INTERVAL '1 month - 1 day')::DATE))::INTEGER
  );

  -- Return as timestamptz at 6 AM UTC
  RETURN v_next_date::TIMESTAMPTZ + INTERVAL '6 hours';
END;
$$;

-- ============================================================
-- 9. Function to calculate reporting period
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_reporting_period(
  p_cadence public.schedule_cadence,
  p_run_date DATE
)
RETURNS TABLE(period_start DATE, period_end DATE)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate the PREVIOUS period that just ended
  CASE p_cadence
    WHEN 'monthly' THEN
      -- Previous month
      v_period_start := DATE_TRUNC('month', p_run_date - INTERVAL '1 month')::DATE;
      v_period_end := (DATE_TRUNC('month', p_run_date) - INTERVAL '1 day')::DATE;

    WHEN 'quarterly' THEN
      -- Previous quarter
      v_period_start := DATE_TRUNC('quarter', p_run_date - INTERVAL '3 months')::DATE;
      v_period_end := (DATE_TRUNC('quarter', p_run_date) - INTERVAL '1 day')::DATE;

    WHEN 'annual' THEN
      -- Previous year
      v_period_start := DATE_TRUNC('year', p_run_date - INTERVAL '1 year')::DATE;
      v_period_end := (DATE_TRUNC('year', p_run_date) - INTERVAL '1 day')::DATE;
  END CASE;

  RETURN QUERY SELECT v_period_start, v_period_end;
END;
$$;

-- ============================================================
-- 10. Trigger to set initial next_run_at on insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_initial_next_run()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.next_run_at IS NULL AND NEW.is_active = true THEN
    NEW.next_run_at := public.calculate_next_run_date(NEW.cadence, NEW.day_of_month);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_initial_next_run ON public.metric_request_schedules;
CREATE TRIGGER trg_set_initial_next_run
BEFORE INSERT ON public.metric_request_schedules
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_next_run();
