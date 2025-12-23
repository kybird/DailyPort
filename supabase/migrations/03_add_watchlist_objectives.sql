
-- Add price objective columns to watchlists table
ALTER TABLE watchlists 
ADD COLUMN IF NOT EXISTS short_entry NUMERIC,
ADD COLUMN IF NOT EXISTS short_stop NUMERIC,
ADD COLUMN IF NOT EXISTS short_target NUMERIC,
ADD COLUMN IF NOT EXISTS mid_entry NUMERIC,
ADD COLUMN IF NOT EXISTS mid_stop NUMERIC,
ADD COLUMN IF NOT EXISTS mid_target NUMERIC,
ADD COLUMN IF NOT EXISTS long_entry NUMERIC,
ADD COLUMN IF NOT EXISTS long_stop NUMERIC,
ADD COLUMN IF NOT EXISTS long_target NUMERIC;

-- Commentary on these columns:
-- short_*: 1-2 weeks perspective
-- mid_*: 1-3 months perspective
-- long_*: 6 months+ perspective
