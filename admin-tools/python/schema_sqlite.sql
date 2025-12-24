-- DailyPort Local Data Lake Schema (SQLite)

-- 1. Master Ticker Table
-- Stores static metadata for all KRX stocks.
CREATE TABLE IF NOT EXISTS tickers (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    market TEXT NOT NULL, -- KOSPI, KOSDAQ, KONEX
    sector TEXT, -- Industry Sector
    listing_date TEXT,
    is_active BOOLEAN DEFAULT 1,
    last_updated DATETIME
);

-- 2. Daily Price History (OHLCV + Fundamental)
-- Stores the permanent history. Inserted daily via Batch.
-- Composite Primary Key (code + date) ensures no duplicates.
CREATE TABLE IF NOT EXISTS daily_price (
    code TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYYMMDD or YYYY-MM-DD
    open REAL,
    high REAL,
    low REAL,
    close REAL,
    volume INTEGER,
    trading_value REAL, -- Transaction amount (Won)
    market_cap REAL,
    
    -- Basic Fundamental (Daily Variance)
    eps REAL,
    per REAL,
    pbr REAL,
    bps REAL,
    div_yield REAL,

    PRIMARY KEY (code, date),
    FOREIGN KEY (code) REFERENCES tickers(code)
);

-- 3. Daily Investor Supply (Net Buying)
-- Explicitly separates investor breakdown data.
CREATE TABLE IF NOT EXISTS daily_supply (
    code TEXT NOT NULL,
    date TEXT NOT NULL,
    individual INTEGER, -- Net Buy Volume/Value
    foreigner INTEGER,
    institution INTEGER,
    
    PRIMARY KEY (code, date),
    FOREIGN KEY (code) REFERENCES tickers(code)
);

-- 4. User Configuration
-- Replacing Supabase for local config storage if needed.
CREATE TABLE IF NOT EXISTS user_config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_price_code ON daily_price(code);
CREATE INDEX IF NOT EXISTS idx_price_date ON daily_price(date);
CREATE INDEX IF NOT EXISTS idx_supply_code ON daily_supply(code);
