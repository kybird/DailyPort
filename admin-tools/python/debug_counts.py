import os
import sqlite3
from supabase import create_client
from dotenv import load_dotenv

# Load credentials from admin-tools/.env.local
current_dir = os.path.dirname(__file__)
env_path = os.path.join(current_dir, "..", ".env.local")
load_dotenv(env_path)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print(f"Credentials missing. URL found: {bool(url)}, Key found: {bool(key)}")
    exit(1)

supabase = create_client(url, key)

def check_table(name):
    try:
        res = supabase.table(name).select("ticker").execute()
        tickers = list(set([r["ticker"] for r in res.data]))
        print(f"Table '{name}': Found {len(tickers)} tickers. {tickers[:5]}")
        return tickers
    except Exception as e:
        print(f"Error reading '{name}': {e}")
        return []

w_tickers = check_table("watchlists")
p_tickers = check_table("portfolios")

all_tickers = list(set(w_tickers + p_tickers))
print(f"\nTotal unique tickers to analyze: {len(all_tickers)}")
if len(all_tickers) == 0:
    print("WARNING: No tickers found in Supabase! Analyzer will have nothing to do.")

# Check for today's reports
try:
    res = supabase.table("daily_analysis_reports").select("ticker, date, created_at").order("created_at", desc=True).limit(5).execute()
    print(f"\nLast 5 reports in Supabase:")
    for r in res.data:
        print(f"Ticker: {r['ticker']}, Date: {r['date']}, CreatedAt: {r['created_at']}")
except Exception as e:
    print(f"Error reading reports: {e}")
