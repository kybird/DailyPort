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
    
print(f"Loading env from: {env_path}")
load_dotenv(env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(url, key)

ticker = "000660.KS"
ticker_raw = "000660"

print(f"Checking Price for {ticker} / {ticker_raw}...")

# Check daily_price
res = supabase.table("daily_price").select("*").eq("ticker", ticker).order("date", desc=True).limit(5).execute()

if res.data:
    print(f"--- Data for {ticker} ---")
    for row in res.data:
        print(f"Date: {row['date']}, Close: {row['close_price']}")
else:
    print(f"No data found for {ticker}")

# Check raw ticker
res_raw = supabase.table("daily_price").select("*").eq("ticker", ticker_raw).order("date", desc=True).limit(5).execute()

if res_raw.data:
    print(f"--- Data for {ticker_raw} ---")
    for row in res_raw.data:
        print(f"Date: {row['date']}, Close: {row['close_price']}")
else:
    print(f"No data found for {ticker_raw}")

# Check storage format for multiple tickers
tickers_to_check = ["000660", "000660.KS", "005930", "005930.KS"]

print("\n--- Checking Ticker Formats in 'daily_analysis_reports' ---")
for t in tickers_to_check:
    res = supabase.table("daily_analysis_reports").select("ticker, created_at").eq("ticker", t).execute()
    if res.data:
        print(f"FOUND: {t} -> {len(res.data)} records")
    else:
        print(f"NOT FOUND: {t}")

print("\n--- Checking Ticker Formats in 'daily_price' ---")
for t in tickers_to_check:
    res = supabase.table("daily_price").select("code, date").eq("code", t).limit(1).execute()
    if res.data:
         print(f"FOUND: {t} -> Exists")
    else:
         print(f"NOT FOUND: {t}")
