-- Migration: 0009_pagination_indexes.sql
-- Description: Add indexes for pagination and founder document delete policy
-- Date: 2026-02-02

-- =============================================================================
-- INDEXES FOR PAGINATION
-- =============================================================================

-- Index for portfolio invitations pagination (investor_id + created_at DESC)
-- Used by: GET /api/investors/portfolio/contacts
CREATE INDEX IF NOT EXISTS idx_portfolio_invitations_investor_created
ON public.portfolio_invitations(investor_id, created_at DESC);

-- Index for documents pagination (company_id + uploaded_at DESC)
-- Note: documents table uses "uploaded_at" not "created_at"
-- Used by: GET /api/founder/documents, GET /api/investors/documents
CREATE INDEX IF NOT EXISTS idx_documents_company_uploaded
ON public.documents(company_id, uploaded_at DESC);

-- =============================================================================
-- FOUNDER DOCUMENT DELETE POLICY
-- =============================================================================

-- Allow founders to delete their own documents
-- Conditions:
--   1. User is a founder
--   2. User uploaded the document
--   3. Document belongs to a company the user founded
CREATE POLICY "documents_delete_founder"
ON public.documents FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  AND public.current_user_role() = 'founder'
  AND EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = documents.company_id AND c.founder_id = auth.uid()
  )
);
