-- Migration: 0014_performance_indexes.sql
-- Description: Composite indexes for frequently queried tables
-- Date: 2026-02-03

-- =============================================================================
-- METRIC REQUESTS
-- =============================================================================

-- Used by: schedule processing (duplicate check), founder request views
CREATE INDEX IF NOT EXISTS idx_metric_requests_investor_company_def_period
ON public.metric_requests(investor_id, company_id, metric_definition_id, period_start, period_end);

-- Used by: status-based filtering (pending requests, submitted requests)
CREATE INDEX IF NOT EXISTS idx_metric_requests_status_due
ON public.metric_requests(status, due_date);

-- Used by: schedule-based lookups
CREATE INDEX IF NOT EXISTS idx_metric_requests_schedule_id
ON public.metric_requests(schedule_id)
WHERE schedule_id IS NOT NULL;

-- =============================================================================
-- COMPANY METRIC VALUES
-- =============================================================================

-- Used by: auto-fulfill trigger, dashboard metric queries
CREATE INDEX IF NOT EXISTS idx_company_metric_values_company_metric_period
ON public.company_metric_values(company_id, metric_name, period_type, period_start);

-- Used by: portfolio metrics aggregation (filtering by period type + date range)
CREATE INDEX IF NOT EXISTS idx_company_metric_values_period_type_start
ON public.company_metric_values(period_type, period_start);

-- =============================================================================
-- METRIC DEFINITIONS
-- =============================================================================

-- Used by: schedule processing (find existing definitions)
CREATE INDEX IF NOT EXISTS idx_metric_definitions_investor_name_period
ON public.metric_definitions(investor_id, name, period_type);

-- =============================================================================
-- METRIC REQUEST SCHEDULES
-- =============================================================================

-- Used by: cron job finding due schedules
CREATE INDEX IF NOT EXISTS idx_metric_request_schedules_active_next_run
ON public.metric_request_schedules(is_active, next_run_at)
WHERE is_active = true;

-- =============================================================================
-- SCHEDULED REQUEST RUNS
-- =============================================================================

-- Used by: run history display per schedule
CREATE INDEX IF NOT EXISTS idx_scheduled_request_runs_schedule_created
ON public.scheduled_request_runs(schedule_id, created_at DESC);

-- =============================================================================
-- METRIC REQUEST REMINDERS
-- =============================================================================

-- Used by: cron job finding due reminders
CREATE INDEX IF NOT EXISTS idx_metric_request_reminders_status_scheduled
ON public.metric_request_reminders(status, scheduled_for)
WHERE status = 'pending';
