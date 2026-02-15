-- Migration: 0034_scalability_indexes.sql
-- Description: Additional indexes for scalability improvements identified in audit
-- Date: 2026-02-15

-- =============================================================================
-- COMPANIES
-- =============================================================================

-- Used by: process-schedules cron, founder portal, founder-deadline-reminders
-- Filters companies by founder_id for ownership checks and batch lookups
CREATE INDEX IF NOT EXISTS idx_companies_founder_id
  ON public.companies (founder_id)
  WHERE founder_id IS NOT NULL;

-- =============================================================================
-- COMPANY METRIC VALUES
-- =============================================================================

-- Used by: benchmarks route ILIKE queries, metric detail route
-- Supports filtering by metric_name across all companies
CREATE INDEX IF NOT EXISTS idx_cmv_metric_name
  ON public.company_metric_values (metric_name);

-- Used by: portfolio summary — fetch values for multiple companies filtered by period
CREATE INDEX IF NOT EXISTS idx_cmv_company_id
  ON public.company_metric_values (company_id);

-- =============================================================================
-- HISTORICAL UPLOAD VALUES
-- =============================================================================

-- Used by: bulk-action, review routes — filter by upload + status for pending/conflict values
CREATE INDEX IF NOT EXISTS idx_huv_upload_status
  ON public.historical_upload_values (upload_id, status);

-- Used by: company-mapping route — filter by upload + company for mapping operations
CREATE INDEX IF NOT EXISTS idx_huv_upload_company
  ON public.historical_upload_values (upload_id, company_id);

-- =============================================================================
-- PORTFOLIO INVITATIONS
-- =============================================================================

-- Used by: contacts route — filter by investor + status for pagination
CREATE INDEX IF NOT EXISTS idx_portfolio_invitations_investor_status
  ON public.portfolio_invitations (investor_id, status);

-- =============================================================================
-- INVESTOR METRIC VALUES
-- =============================================================================

-- Used by: metrics merge route — fetch investor values for a company
CREATE INDEX IF NOT EXISTS idx_imv_investor_company
  ON public.investor_metric_values (investor_id, company_id);

-- =============================================================================
-- FOUNDER REMINDER LOG
-- =============================================================================

-- Used by: deadline-reminders cron — batch dedup check for existing reminders
CREATE INDEX IF NOT EXISTS idx_frl_founder_id
  ON public.founder_reminder_log (founder_id);

-- =============================================================================
-- METRIC REQUESTS
-- =============================================================================

-- Used by: founder portal — fetch pending requests for a company
CREATE INDEX IF NOT EXISTS idx_metric_requests_company_status
  ON public.metric_requests (company_id, status);

-- =============================================================================
-- ACTIVITY LOG
-- =============================================================================

-- Used by: activity feed — fetch recent activity per company
CREATE INDEX IF NOT EXISTS idx_activity_log_company_created
  ON public.activity_log (company_id, created_at DESC)
  WHERE company_id IS NOT NULL;
