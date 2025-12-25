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

print("--- Normalizing Watchlist Tickers ---")
res = supabase.table("watchlists").select("*").execute()

if res.data:
    updates = []
    for item in res.data:
        ticker = item.get('ticker')
        if ticker and ('.KS' in ticker or '.KQ' in ticker):
            clean_ticker = ticker.split('.')[0]
            print(f"Fixing {ticker} -> {clean_ticker}")
            # We need to delete the old one and insert/update the new one because ticker is likely part of a unique constraint or primary key?
            # Actually, `id` is the primary key usually. Let's check schema. 
            # If (user_id, ticker) is unique, just updating might fail if clean exists.
            
            # Simple approach: Delete old, Insert new (ignore conflict if exists)
            # Better: Update by ID.
            
            try:
                # First check if clean version already exists for this user
                existing = supabase.table("watchlists").select("*").eq("user_id", item['user_id']).eq("ticker", clean_ticker).execute()
                if existing.data:
                    # Duplicate would allow, so just delete the dirty one
                    print(f"  Clean version already exists for user. Deleting dirty {ticker}...")
                    supabase.table("watchlists").delete().eq("id", item['id']).execute()
                else:
                    # Update dirty to clean
                    print(f"  Updating {ticker} to {clean_ticker}...")
                    supabase.table("watchlists").update({"ticker": clean_ticker}).eq("id", item['id']).execute()
                    
            except Exception as e:
                print(f"  Error processing {ticker}: {e}")
                
    print("--- Cleanup Complete ---")
else:
    print("Watchlist is empty or clean.")
