import os
from supabase import create_client
from dotenv import load_dotenv

# Load credentials from admin-tools/.env.local
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(env_path)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Credentials missing")
    exit(1)

import sqlite3
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "dailyport.db")
print(f"\n--- Checking Local SQLite: {DB_PATH} ---")
if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM tickers")
    print(f"Tickers count: {cur.fetchone()[0]}")
    cur.execute("SELECT MAX(date) FROM daily_price")
    print(f"Latest price date: {cur.fetchone()[0]}")
    conn.close()
else:
    print("SQLite DB NOT FOUND at expected path.")

supabase = create_client(url, key)

print("--- Verifying daily_analysis_reports ---")
try:
    count_res = supabase.table("daily_analysis_reports").select("id", count="exact").execute()
    print(f"Total reports count: {count_res.count}")
    res = supabase.table("daily_analysis_reports").select("date, ticker, created_at").order("created_at", desc=True).limit(5).execute()
    if res.data:
        print(f"Latest 5 reports:")
        for r in res.data:
            print(r)
except Exception as e:
    print(f"Error reading daily_analysis_reports: {e}")

print("\n--- Verifying watchlists ---")
try:
    res = supabase.table("watchlists").select("ticker").execute()
    if res.data:
        tickers = [r["ticker"] for r in res.data]
        print(f"Found {len(tickers)} tickers in watchlist: {tickers}")
    else:
        print("Watchlist is EMPTY.")
except Exception as e:
    print(f"Error reading watchlists: {e}")

print("\n--- Verifying algo_picks ---")
try:
    res = supabase.table("algo_picks").select("*").order("date", desc=True).execute()
    if res.data:
        print(f"Found {len(res.data)} entries in algo_picks:")
        for r in res.data:
            print(f"Date: {r['date']}, Strategy: {r['strategy_name']}, Tickers Count: {len(r['tickers'])}")
    else:
        print("No entries found in algo_picks.")
except Exception as e:
    print(f"Error reading algo_picks: {e}")

# Check legacy table just in case
print("\n--- Checking legacy guru_picks (should be empty if renamed) ---")
try:
    res = supabase.table("guru_picks").select("id").limit(1).execute()
    print(f"guru_picks contains data: {bool(res.data)}")
except Exception as e:
    print(f"guru_picks table status: {e}")
