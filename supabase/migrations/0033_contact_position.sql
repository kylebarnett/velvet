-- Add optional position (job title) field to portfolio contacts
ALTER TABLE portfolio_invitations ADD COLUMN position text;

-- Populate existing rows with sample positions for dev/test data
WITH numbered AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at)) % 5 AS idx
  FROM portfolio_invitations
)
UPDATE portfolio_invitations pi
SET position = CASE numbered.idx
  WHEN 0 THEN 'CEO'
  WHEN 1 THEN 'CFO'
  WHEN 2 THEN 'CTO'
  WHEN 3 THEN 'Head of Finance'
  WHEN 4 THEN 'COO'
END
FROM numbered
WHERE pi.id = numbered.id;
