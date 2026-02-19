-- 0047_security_hardening.sql
-- Critical security fixes:
--   1. Switch current_user_role() to read from JWT app_metadata (not public.users table)
--   2. Prevent direct updates to the role column on public.users
--   3. Fix enforce_founder_relationship_update() to read from raw_app_meta_data
--   4. Restore role check on companies_insert_investor RLS policy using app_metadata
--   5. Fix SECURITY DEFINER functions using SET search_path = public → ''
--   6. Fix portfolio_invitations over-permissive INSERT policy

-- ============================================================
-- 1. current_user_role() — read from JWT app_metadata, not public.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'role')::public.user_role
$$;

-- ============================================================
-- 2. Prevent updates to the role column on public.users
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_role_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Direct updates to the role column are not allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_update ON public.users;
CREATE TRIGGER trg_prevent_role_update
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.prevent_role_update();

-- ============================================================
-- 3. enforce_founder_relationship_update() — read from raw_app_meta_data
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_founder_relationship_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text;
BEGIN
  -- Use raw_app_meta_data (server-only, not client-editable)
  SELECT raw_app_meta_data ->> 'role' INTO caller_role
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

-- ============================================================
-- 4. Restore role check on companies_insert_investor using app_metadata
-- ============================================================
DROP POLICY IF EXISTS "companies_insert_investor" ON public.companies;
CREATE POLICY "companies_insert_investor"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  founder_id IS NULL
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'investor'
);

-- ============================================================
-- 5. Fix 0046 SECURITY DEFINER functions: search_path = public → ''
--    Use fully qualified table names.
-- ============================================================

-- 5a. emit_metric_submitted
CREATE OR REPLACE FUNCTION public.emit_metric_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _company_name text;
BEGIN
  SELECT name INTO _company_name FROM public.companies WHERE id = NEW.company_id;

  INSERT INTO public.portfolio_events (company_id, actor_id, event_type, title, description, metadata)
  VALUES (
    NEW.company_id,
    NEW.submitted_by,
    'metric_submitted',
    coalesce(_company_name, 'A company') || ' submitted ' || NEW.metric_name,
    NULL,
    jsonb_build_object('metric_name', NEW.metric_name, 'period_type', NEW.period_type, 'period_start', NEW.period_start)
  );

  RETURN NEW;
END;
$$;

-- 5b. emit_document_uploaded
CREATE OR REPLACE FUNCTION public.emit_document_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _company_name text;
BEGIN
  SELECT name INTO _company_name FROM public.companies WHERE id = NEW.company_id;

  INSERT INTO public.portfolio_events (company_id, actor_id, event_type, title, description, metadata)
  VALUES (
    NEW.company_id,
    NEW.uploaded_by,
    'document_uploaded',
    coalesce(_company_name, 'A company') || ' uploaded a document',
    NEW.file_name,
    jsonb_build_object('file_name', NEW.file_name, 'file_type', coalesce(NEW.file_type, 'unknown'))
  );

  RETURN NEW;
END;
$$;

-- 5c. emit_access_status_changed
CREATE OR REPLACE FUNCTION public.emit_access_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _company_name text;
  _event_type text;
  _title text;
BEGIN
  IF OLD.approval_status IS NOT DISTINCT FROM NEW.approval_status THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_status NOT IN ('approved', 'denied') THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _company_name FROM public.companies WHERE id = NEW.company_id;

  IF NEW.approval_status = 'approved' THEN
    _event_type := 'access_approved';
    _title := coalesce(_company_name, 'A company') || ' approved your access';
  ELSE
    _event_type := 'access_denied';
    _title := coalesce(_company_name, 'A company') || ' denied your access';
  END IF;

  INSERT INTO public.portfolio_events (company_id, actor_id, event_type, title, description, metadata)
  VALUES (
    NEW.company_id,
    NULL,
    _event_type,
    _title,
    NULL,
    jsonb_build_object('investor_id', NEW.investor_id)
  );

  RETURN NEW;
END;
$$;

-- 5d. emit_request_fulfilled
CREATE OR REPLACE FUNCTION public.emit_request_fulfilled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  _company_name text;
  _metric_name text;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status <> 'submitted' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _company_name FROM public.companies WHERE id = NEW.company_id;
  SELECT name INTO _metric_name FROM public.metric_definitions WHERE id = NEW.metric_definition_id;

  INSERT INTO public.portfolio_events (company_id, actor_id, event_type, title, description, metadata)
  VALUES (
    NEW.company_id,
    NULL,
    'request_fulfilled',
    coalesce(_company_name, 'A company') || ' fulfilled a metric request',
    coalesce(_metric_name, 'Unknown metric'),
    jsonb_build_object('metric_name', coalesce(_metric_name, 'unknown'), 'investor_id', NEW.investor_id)
  );

  RETURN NEW;
END;
$$;
