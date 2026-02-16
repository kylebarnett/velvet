-- 0026_investor_tear_sheets.sql
-- Extend tear_sheets table to support investor-created tear sheets.
-- Investors can create their own internal memos about portfolio companies.

-- ============================================================
-- 1. Make founder_id nullable, add investor_id and creator_role
-- ============================================================

ALTER TABLE public.tear_sheets
  ALTER COLUMN founder_id DROP NOT NULL;

ALTER TABLE public.tear_sheets
  ADD COLUMN investor_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN creator_role text NOT NULL DEFAULT 'founder'
    CHECK (creator_role IN ('founder', 'investor'));

-- Exactly one of founder_id or investor_id must be set
ALTER TABLE public.tear_sheets
  ADD CONSTRAINT chk_tear_sheets_one_owner
    CHECK (
      (founder_id IS NOT NULL AND investor_id IS NULL) OR
      (founder_id IS NULL AND investor_id IS NOT NULL)
    );

-- ============================================================
-- 2. Replace unique constraint with partial unique indexes
-- ============================================================

-- Drop the old unique constraint (one tear sheet per company per quarter)
ALTER TABLE public.tear_sheets
  DROP CONSTRAINT IF EXISTS tear_sheets_company_id_quarter_year_key;

-- One per founder per company per quarter
CREATE UNIQUE INDEX idx_tear_sheets_founder_unique
  ON public.tear_sheets(company_id, founder_id, quarter, year)
  WHERE founder_id IS NOT NULL;

-- One per investor per company per quarter
CREATE UNIQUE INDEX idx_tear_sheets_investor_unique
  ON public.tear_sheets(company_id, investor_id, quarter, year)
  WHERE investor_id IS NOT NULL;

-- ============================================================
-- 3. Add investor index for fast lookups
-- ============================================================

CREATE INDEX idx_tear_sheets_investor ON public.tear_sheets(investor_id)
  WHERE investor_id IS NOT NULL;

-- ============================================================
-- 4. RLS policies for investor tear sheets
-- ============================================================

-- Investors can manage their own tear sheets (CRUD)
CREATE POLICY "tear_sheets_investor_own_all" ON public.tear_sheets
  FOR ALL TO authenticated
  USING (investor_id = auth.uid())
  WITH CHECK (investor_id = auth.uid());

-- Update existing investor SELECT policy to also allow investors
-- to read their own drafts (the existing policy only allows published).
-- Drop and recreate to include the OR condition.
DROP POLICY IF EXISTS "tear_sheets_investor_select" ON public.tear_sheets;

CREATE POLICY "tear_sheets_investor_select" ON public.tear_sheets
  FOR SELECT TO authenticated
  USING (
    -- Investor's own tear sheets (any status)
    investor_id = auth.uid()
    OR
    -- Published founder tear sheets for approved companies
    (
      status = 'published'
      AND founder_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.investor_company_relationships
        WHERE company_id = tear_sheets.company_id
        AND investor_id = auth.uid()
        AND approval_status IN ('auto_approved', 'approved')
      )
    )
  );
