-- 0006_document_types.sql
-- Add document_type enum and metadata columns to documents table
-- Supports categorization for investor document browsing

-- ============================================================
-- 1. Create document_type enum
-- ============================================================

CREATE TYPE public.document_type AS ENUM (
  'income_statement',
  'balance_sheet',
  'cash_flow_statement',
  'consolidated_financial_statements',
  '409a_valuation',
  'investor_update',
  'board_deck',
  'cap_table',
  'other'
);

-- ============================================================
-- 2. Add columns to documents table
-- ============================================================

-- Add document_type column with default 'other' for existing records
ALTER TABLE public.documents
ADD COLUMN document_type public.document_type NOT NULL DEFAULT 'other';

-- Add description field for optional context
ALTER TABLE public.documents
ADD COLUMN description text;

-- Index for filtering by document type
CREATE INDEX idx_documents_document_type ON public.documents(document_type);

-- ============================================================
-- 3. RLS Policy for Investor Read Access
-- ============================================================

-- Allow investors to read documents for companies in their portfolio
-- (where the investor has an approved relationship)
CREATE POLICY "documents_investor_select"
ON public.documents FOR SELECT TO authenticated
USING (
  public.current_user_role() = 'investor'
  AND EXISTS (
    SELECT 1 FROM public.investor_company_relationships icr
    WHERE icr.company_id = documents.company_id
      AND icr.investor_id = auth.uid()
      AND icr.approval_status IN ('auto_approved', 'approved')
  )
);
