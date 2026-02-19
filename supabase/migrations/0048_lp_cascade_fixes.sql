-- 0048_lp_cascade_fixes.sql
-- Fix foreign key cascades to unblock user/company deletion,
-- add missing indexes on LP tables, and tighten CHECK constraints.

-- ============================================================
-- 1. ON DELETE CASCADE fixes
-- ============================================================

-- funds.investor_id → CASCADE so deleting a user removes their funds
ALTER TABLE funds
  DROP CONSTRAINT IF EXISTS funds_investor_id_fkey,
  ADD CONSTRAINT funds_investor_id_fkey
    FOREIGN KEY (investor_id) REFERENCES users(id) ON DELETE CASCADE;

-- fund_investments.company_id → CASCADE so deleting a company removes investments
ALTER TABLE fund_investments
  DROP CONSTRAINT IF EXISTS fund_investments_company_id_fkey,
  ADD CONSTRAINT fund_investments_company_id_fkey
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- ============================================================
-- 2. ON DELETE SET NULL fixes (make columns nullable first)
-- ============================================================

-- company_metric_values.submitted_by → SET NULL (preserve rows when user deleted)
ALTER TABLE company_metric_values
  ALTER COLUMN submitted_by DROP NOT NULL;

ALTER TABLE company_metric_values
  DROP CONSTRAINT IF EXISTS company_metric_values_submitted_by_fkey,
  ADD CONSTRAINT company_metric_values_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;

-- metric_submissions.submitted_by → SET NULL (preserve rows when user deleted)
ALTER TABLE metric_submissions
  ALTER COLUMN submitted_by DROP NOT NULL;

ALTER TABLE metric_submissions
  DROP CONSTRAINT IF EXISTS metric_submissions_submitted_by_fkey,
  ADD CONSTRAINT metric_submissions_submitted_by_fkey
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;

-- documents.uploaded_by → SET NULL (preserve rows when user deleted)
ALTER TABLE documents
  ALTER COLUMN uploaded_by DROP NOT NULL;

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey,
  ADD CONSTRAINT documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- 3. Missing indexes on LP tables
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_funds_investor_id
  ON funds (investor_id);

CREATE INDEX IF NOT EXISTS idx_fund_investments_fund_id
  ON fund_investments (fund_id);

CREATE INDEX IF NOT EXISTS idx_fund_investments_company_id
  ON fund_investments (company_id);

CREATE INDEX IF NOT EXISTS idx_lp_reports_fund_id_report_date
  ON lp_reports (fund_id, report_date);

-- ============================================================
-- 4. NOT NULL + CHECK constraints on LP tables
-- ============================================================

-- lp_reports.status — add CHECK constraint
ALTER TABLE lp_reports
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'draft';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lp_reports_status_check'
      AND conrelid = 'lp_reports'::regclass
  ) THEN
    ALTER TABLE lp_reports
      ADD CONSTRAINT lp_reports_status_check
        CHECK (status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

-- lp_reports.report_type — add CHECK constraint
-- Existing default is 'quarterly'; valid types are quarterly and annual
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lp_reports_report_type_check'
      AND conrelid = 'lp_reports'::regclass
  ) THEN
    ALTER TABLE lp_reports
      ADD CONSTRAINT lp_reports_report_type_check
        CHECK (report_type IN ('quarterly', 'annual'));
  END IF;
END $$;

-- lp_reports.created_at — ensure NOT NULL with default
ALTER TABLE lp_reports
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();

-- funds.created_at — ensure NOT NULL with default
ALTER TABLE funds
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now();
