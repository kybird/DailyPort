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
supabase = create_client(url, key)

TICKER = "005930"

print(f"--- Checking Supabase Report for {TICKER} ---")
res = supabase.table("daily_analysis_reports").select("report_data").eq("ticker", TICKER).single().execute()
if res.data:
    rd = res.data["report_data"]
    chart = rd.get("supply_chart", [])
    print(f"Chart Items: {len(chart)}")
    if chart:
        print(f"Latest 3 Items in Chart:")
        for item in chart[-3:]:
            print(item)
    metrics = rd.get("metrics", {})
    print(f"Metrics: {metrics}")
else:
    print("No report found in Supabase.")

print(f"\n--- Checking Local SQLite for {TICKER} ---")
DB_PATH = os.path.join(current_dir, "..", "..", "dailyport.db")
if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT date, foreigner, institution FROM daily_supply WHERE code=? ORDER BY date DESC LIMIT 5", (TICKER,))
    rows = cur.fetchall()
    print("Latest 5 days in SQLite:")
    for r in rows:
        print(r)
    conn.close()
else:
    print("SQLite DB not found.")
