-- Migration: 0032_performance_indexes_v2.sql
-- Description: Additional indexes for common query patterns identified in scalability audit
-- Date: 2026-02-13

-- =============================================================================
-- INVESTOR COMPANY RELATIONSHIPS
-- =============================================================================

-- Used by: dashboard, summary, benchmarks — fetch approved companies per investor
CREATE INDEX IF NOT EXISTS idx_icr_investor_approval
  ON public.investor_company_relationships (investor_id, approval_status);

-- =============================================================================
-- METRIC REQUESTS
-- =============================================================================

-- Used by: metric-requests route — fetch all requests per investor
CREATE INDEX IF NOT EXISTS idx_metric_requests_investor
  ON public.metric_requests (investor_id);

-- Used by: metric-requests route — count pending/submitted per investor
CREATE INDEX IF NOT EXISTS idx_metric_requests_investor_status
  ON public.metric_requests (investor_id, status);

-- =============================================================================
-- COMPANY METRIC VALUES
-- =============================================================================

-- Used by: dashboard, summary — fetch by company ordered by period desc
CREATE INDEX IF NOT EXISTS idx_cmv_company_period
  ON public.company_metric_values (company_id, period_start DESC);
