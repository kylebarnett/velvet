-- Extended company profile fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founded_date date;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS hq_location text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS headcount integer;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS total_funding_raised bigint;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_round_amount bigint;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS last_round_date date;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
