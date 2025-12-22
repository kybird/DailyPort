
-- 1. Portfolios (User unique ticker constraint)
CREATE TABLE portfolios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticker TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  entry_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'KRW', -- Currency unit specified
  target_weight NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

-- 2. Supply/Demand Data (Source and Generation Time)
CREATE TABLE ticker_insights (
  ticker TEXT PRIMARY KEY,
  foreign_net_buy BIGINT DEFAULT 0,
  inst_net_buy BIGINT DEFAULT 0,
  source TEXT NOT NULL, -- 'KIS', 'YAHOO', 'PUBLIC'
  generated_at TIMESTAMPTZ NOT NULL, -- Actual data generation time
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Configs
CREATE TABLE user_configs (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  google_sheet_id TEXT,
  telegram_chat_id TEXT
);

-- 4. Watchlists (Reusing portfolio logic or separate table)
-- Assuming separate table for wishlist items
CREATE TABLE watchlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  ticker TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);


-- RLS Policies

-- portfolios RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own portfolios" ON portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own portfolios" ON portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own portfolios" ON portfolios FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own portfolios" ON portfolios FOR DELETE USING (auth.uid() = user_id);

-- watchlists RLS
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own watchlists" ON watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own watchlists" ON watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own watchlists" ON watchlists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete own watchlists" ON watchlists FOR DELETE USING (auth.uid() = user_id);

-- ticker_insights RLS
ALTER TABLE ticker_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view insights" ON ticker_insights FOR SELECT USING (true);
CREATE POLICY "admin insert insights" ON ticker_insights FOR INSERT WITH CHECK (true); -- Allow insert for now, or restrict later
CREATE POLICY "admin update insights" ON ticker_insights FOR UPDATE USING (true); -- Allow update for now

-- user_configs RLS
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select own configs" ON user_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert own configs" ON user_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update own configs" ON user_configs FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
