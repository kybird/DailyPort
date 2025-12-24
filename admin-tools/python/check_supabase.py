import os
from supabase import create_client
from dotenv import load_dotenv

# Try to find credentials
env_paths = [
    "admin-tools/.env.local",
    ".env.local",
    "admin-tools/python/.env"
]

found_env = False
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)
        found_env = True
        print(f"Loaded env from {p}")
        break

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Credentials missing.")
    exit(1)

supabase = create_client(url, key)

res = supabase.table("daily_analysis_reports").select("date", "ticker").order("date", desc=True).limit(5).execute()

print("Latest 5 entries in daily_analysis_reports:")
for r in res.data:
    print(r)

# Check count for today
from datetime import datetime
today = datetime.now().strftime("%Y-%m-%d")
res_today = supabase.table("daily_analysis_reports").select("ticker", count="exact").eq("date", today).execute()
print(f"\nTotal entries for today ({today}): {res_today.count}")
