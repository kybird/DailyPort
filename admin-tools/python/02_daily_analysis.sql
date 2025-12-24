-- Migration: 02_daily_analysis.sql
-- Purpose: Create tables for storing daily analysis reports and guru screening picks.

-- 1. Table: daily_analysis_reports
-- Stores the daily technical and supply analysis for each ticker.
-- report_data contains: signal, summary, trend, technical_score, supply_chart (array)
create table if not exists public.daily_analysis_reports (
    date date not null,
    ticker text not null,
    report_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (date, ticker)
);

-- Enable RLS
alter table public.daily_analysis_reports enable row level security;

-- Policy: Allow read access to everyone (public data)
create policy "Allow public read access"
    on public.daily_analysis_reports for select
    using (true);

-- Policy: Allow service_role (backend) to insert/update
create policy "Allow service_role write access"
    on public.daily_analysis_reports for all
    using (true)
    with check (true);


-- 2. Table: guru_picks
-- Stores the results of daily screening strategies (e.g., "Value Picks", "Supply Picks").
create table if not exists public.guru_picks (
    date date not null,
    strategy_name text not null,
    tickers jsonb, -- Array of ticker codes
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (date, strategy_name)
);

-- Enable RLS
alter table public.guru_picks enable row level security;

-- Policy: Allow public read access
create policy "Allow public read access"
    on public.guru_picks for select
    using (true);

-- Policy: Allow service_role write access
create policy "Allow service_role write access"
    on public.guru_picks for all
    using (true)
    with check (true);
