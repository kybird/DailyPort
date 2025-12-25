-- 4. Add details column to algo_picks for v5 metadata
ALTER TABLE algo_picks ADD COLUMN IF NOT EXISTS details JSONB;

-- Update comment for clarification
COMMENT ON COLUMN algo_picks.details IS 'Rich metadata for v5 screening results (rank, scores, snapshots)';
