import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load Env
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../.env.local')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')

load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(url, key)
ticker = "125490"

print(f"--- Debugging {ticker} ---")

# 1. Check Watchlist
print("\n[1] Watchlist Check:")
res_wl = supabase.table("watchlists").select("*").eq("ticker", ticker).execute()
if res_wl.data:
    print(f"✅ Found in Watchlist for {len(res_wl.data)} users.")
else:
    print("❌ NOT in Watchlist. (Admin tool usually only runs for watchlist items)")

# 2. Check Analysis Report
print("\n[2] Report Check:")
res_rep = supabase.table("daily_analysis_reports").select("*").eq("ticker", ticker).execute()
if res_rep.data:
    row = res_rep.data[0]
    print(f"✅ Found Report.")
    print(f"   Ticker in DB: '{row['ticker']}'")
    print(f"   Date: {row['date']}")
    print(f"   Created At: {row['created_at']}")
    
    # Inspect report_data structure
    rd = row.get('report_data', {})
    print(f"   Summary: {rd.get('summary')}")
    print(f"   Supply Chart Items: {len(rd.get('supply_chart', []))}")
    print(f"   V3 Objectives: {rd.get('v3_objectives') is not None}")
    
    # Check if supply chart has valid data
    if rd.get('supply_chart'):
        print(f"   Latest Supply Data: {rd['supply_chart'][-1]}")
else:
    print("❌ NO Analysis Report found.")

# 3. Check Price Data
print("\n[3] Price Data Check:")
try:
    res_price = supabase.table("daily_price").select("date, close").eq("code", ticker).order("date", desc=True).limit(5).execute()
    if res_price.data:
        print(f"✅ Found Price Data. Latest: {res_price.data[0]['date']} @ {res_price.data[0]['close']}")
    else:
        print("❌ NO Price Data found. (Might be a new listing or sync fail)")
except Exception as e:
    print(f"⚠️ Failed to check daily_price (Schema Error?): {e}")

# 4. Check Algo Picks
print("\n[4] Algo Picks Check:")
try:
    res_algo = supabase.table("algo_picks").select("*").order("date", desc=True).limit(5).execute()
    found_in_algo = False
    if res_algo.data:
        for row in res_algo.data:
            tickers = row.get("tickers", [])
            if ticker in tickers:
                print(f"✅ Found in Algo Strategy: {row['strategy_name']} ({row['date']})")
                found_in_algo = True
        if not found_in_algo:
            print("❌ NOT found in recent Algo Picks.")
    else:
        print("❌ No Algo Picks data found.")
except Exception as e:
    print(f"⚠️ Failed to check algo_picks: {e}")
