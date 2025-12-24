import os
from supabase import create_client
from dotenv import load_dotenv

# Load from root .env.local (which usually has the public keys)
load_dotenv(".env.local")

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Public credentials missing in .env.local")
    exit(1)

print(f"Testing ANON access to {url}")
supabase = create_client(url, key)

try:
    res = supabase.table("daily_analysis_reports").select("date", "ticker").order("date", desc=True).limit(5).execute()
    print("ANON Access Success. Latest 5 entries:")
    for r in res.data:
        print(r)
except Exception as e:
    print(f"ANON Access Failed: {e}")

# Check for a specific ticker that we know exists
test_ticker = "005930"
res_test = supabase.table("daily_analysis_reports").select("*").eq("ticker", test_ticker).limit(1).execute()
if res_test.data:
    print(f"\nFound report for {test_ticker}")
else:
    print(f"\nReport NOT found for {test_ticker} via ANON key")
