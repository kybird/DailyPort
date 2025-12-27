import sqlite3
import os
import time
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

# Config
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')

# Env Loading
env_path = os.path.join(os.path.dirname(__file__), '.env')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../.env.local')
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(__file__), '../../.env.local')
load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Missing Supabase credentials.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row

def sync_prices(days=90):
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y%m%d")
    print(f"🚀 Syncing Daily Price from SQLite to Supabase (Since {cutoff_date})...")

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM daily_price WHERE date >= ?", (cutoff_date,))
    rows = cursor.fetchall()
    
    total = len(rows)
    print(f"📊 Found {total} records to sync.")

    batch_size = 1000
    batch = []
    
    for i, row in enumerate(rows):
        # Map SQLite columns to Supabase columns
        # SQLite: code, date, open, high, low, close, volume...
        # Supabase: same
        record = {
            "code": row['code'],
            "date": row['date'], # Assuming YYYYMMDD format in SQLite
            "open": row['open'],
            "high": row['high'],
            "low": row['low'],
            "close": row['close'],
            "volume": row['volume']
        }
        batch.append(record)

        if len(batch) >= batch_size:
            try:
                supabase.table('daily_price').upsert(batch).execute()
                print(f"   Generated {i+1}/{total}...", end='\r')
            except Exception as e:
                print(f"\n❌ Error syncing batch: {e}")
            batch = []
            
    # Final batch
    if batch:
        try:
            supabase.table('daily_price').upsert(batch).execute()
        except Exception as e:
            print(f"\n❌ Error syncing final batch: {e}")

    print(f"\n✅ Sync Completed.")

if __name__ == "__main__":
    sync_prices()
