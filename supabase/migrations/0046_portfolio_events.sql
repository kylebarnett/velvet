-- 0046_portfolio_events.sql
-- Portfolio activity events: tracks founder actions (metric submissions, document uploads,
-- access changes, request fulfillments) so investors see a live activity feed.

-- ============================================================
-- 1. Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.portfolio_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'metric_submitted',
    'document_uploaded',
    'access_approved',
    'access_denied',
    'request_fulfilled'
  )),
  title text NOT NULL,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Indexes
-- ============================================================

CREATE INDEX idx_portfolio_events_company_created
  ON public.portfolio_events (company_id, created_at DESC);

CREATE INDEX idx_portfolio_events_created
  ON public.portfolio_events (created_at DESC);

CREATE INDEX idx_portfolio_events_actor
  ON public.portfolio_events (actor_id)
  WHERE actor_id IS NOT NULL;

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.portfolio_events ENABLE ROW LEVEL SECURITY;

-- Investors can read events for companies where they have approved access
DROP POLICY IF EXISTS "investors_read_portfolio_events" ON public.portfolio_events;
CREATE POLICY "investors_read_portfolio_events"
ON public.portfolio_events FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.investor_company_relationships icr
    WHERE icr.company_id = portfolio_events.company_id
      AND icr.investor_id = auth.uid()
      AND icr.approval_status IN ('auto_approved', 'approved')
  )
);

-- Investors can also see their own access events (approved/denied) even if currently denied
DROP POLICY IF EXISTS "investors_read_own_access_events" ON public.portfolio_events;
CREATE POLICY "investors_read_own_access_events"
ON public.portfolio_events FOR SELECT TO authenticated
USING (
  event_type IN ('access_approved', 'access_denied')
  AND (metadata->>'investor_id')::text = auth.uid()::text
);

-- ============================================================
-- 4. Trigger Functions (SECURITY DEFINER — bypass RLS to INSERT)
-- ============================================================

-- 4a. Metric submitted
CREATE OR REPLACE FUNCTION public.emit_metric_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

DROP TRIGGER IF EXISTS trg_emit_metric_submitted ON public.company_metric_values;
CREATE TRIGGER trg_emit_metric_submitted
AFTER INSERT ON public.company_metric_values
FOR EACH ROW EXECUTE PROCEDURE public.emit_metric_submitted();

-- 4b. Document uploaded
CREATE OR REPLACE FUNCTION public.emit_document_uploaded()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
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

DROP TRIGGER IF EXISTS trg_emit_document_uploaded ON public.documents;
CREATE TRIGGER trg_emit_document_uploaded
AFTER INSERT ON public.documents
FOR EACH ROW EXECUTE PROCEDURE public.emit_document_uploaded();

-- 4c. Access status changed (approved / denied)
CREATE OR REPLACE FUNCTION public.emit_access_status_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _company_name text;
  _event_type text;
  _title text;
BEGIN
  -- Only fire when approval_status actually changes to approved or denied
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
    NULL, -- actor is the founder, but we don't expose their identity here
    _event_type,
    _title,
    NULL,
    jsonb_build_object('investor_id', NEW.investor_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_emit_access_status_changed ON public.investor_company_relationships;
CREATE TRIGGER trg_emit_access_status_changed
AFTER UPDATE ON public.investor_company_relationships
FOR EACH ROW EXECUTE PROCEDURE public.emit_access_status_changed();

-- 4d. Request fulfilled (metric_requests status changes to 'submitted')
CREATE OR REPLACE FUNCTION public.emit_request_fulfilled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _company_name text;
  _metric_name text;
BEGIN
  -- Only fire when status changes to 'submitted'
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

DROP TRIGGER IF EXISTS trg_emit_request_fulfilled ON public.metric_requests;
CREATE TRIGGER trg_emit_request_fulfilled
AFTER UPDATE ON public.metric_requests
FOR EACH ROW EXECUTE PROCEDURE public.emit_request_fulfilled();

-- ============================================================
-- 5. Backfill existing data so the activity feed isn't empty
-- ============================================================

-- Backfill metric submissions (last 90 days)
INSERT INTO public.portfolio_events (company_id, actor_id, event_type, title, description, metadata, created_at)
SELECT
  cmv.company_id,
  cmv.submitted_by,
  'metric_submitted',
  coalesce(c.name, 'A company') || ' submitted ' || cmv.metric_name,
  NULL,
  jsonb_build_object('metric_name', cmv.metric_name, 'period_type', cmv.period_type, 'period_start', cmv.period_start),
  cmv.submitted_at
FROM public.company_metric_values cmv
JOIN public.companies c ON c.id = cmv.company_id
WHERE cmv.submitted_at >= now() - interval '90 days';

-- Backfill document uploads (last 90 days)
INSERT INTO public.portfolio_events (company_id, actor_id, event_type, title, description, metadata, created_at)
SELECT
  d.company_id,
  d.uploaded_by,
  'document_uploaded',
  coalesce(c.name, 'A company') || ' uploaded a document',
  d.file_name,
  jsonb_build_object('file_name', d.file_name, 'file_type', coalesce(d.file_type, 'unknown')),
  d.uploaded_at
FROM public.documents d
JOIN public.companies c ON c.id = d.company_id
WHERE d.uploaded_at >= now() - interval '90 days';
