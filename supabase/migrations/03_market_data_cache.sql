-- Market Data Cache Table
-- Stores real-time price data with 5-minute TTL
CREATE TABLE IF NOT EXISTS market_data_cache (
    ticker TEXT PRIMARY KEY,
    current_price NUMERIC NOT NULL,
    change_price NUMERIC NOT NULL,
    change_percent NUMERIC NOT NULL,
    volume BIGINT,
    market_cap BIGINT,
    cached_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for TTL queries
CREATE INDEX IF NOT EXISTS idx_market_data_cache_cached_at ON market_data_cache(cached_at);

-- RLS Policies
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to market data cache"
ON market_data_cache FOR SELECT
TO public
USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to manage market data cache"
ON market_data_cache FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
