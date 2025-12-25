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

print("--- Inspecting Watchlist ---")
res = supabase.table("watchlists").select("*").execute()
if res.data:
    for item in res.data:
        print(f"Ticker: {item.get('ticker')}, UserID: {item.get('user_id')}")
else:
    print("Watchlist is empty.")
