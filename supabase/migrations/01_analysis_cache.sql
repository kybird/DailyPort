
-- Analysis Cache Table
CREATE TABLE analysis_cache (
  ticker TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL -- 'YAHOO', 'PUBLIC'
);

-- RLS for Analysis Cache
ALTER TABLE analysis_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view analysis cache" ON analysis_cache FOR SELECT USING (true);
CREATE POLICY "system insert analysis cache" ON analysis_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "system update analysis cache" ON analysis_cache FOR UPDATE USING (true);
