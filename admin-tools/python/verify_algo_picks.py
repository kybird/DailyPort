import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Load env from multiple possible locations
for path in ['.env', '../.env.local', '../../.env.local']:
    if os.path.exists(path):
        load_dotenv(path)
        print(f"Loaded env from: {path}")
        break

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

print(f"URL: {url[:30] if url else 'NONE'}...")
print(f"KEY: {'SET' if key else 'NONE'}")

if not url or not key:
    print("ERROR: Supabase credentials not found")
    exit(1)

supabase = create_client(url, key)
result = supabase.table("algo_picks").select("strategy_name,tickers,details").order("date", desc=True).limit(6).execute()

print("=" * 60)
print("Algo Picks v5 Verification")
print("=" * 60)

for row in result.data:
    strategy = row['strategy_name']
    tickers = row['tickers']
    details = row.get('details', {})
    
    print(f"\n[STRATEGY] {strategy}")
    print(f"   Tickers: {tickers}")
    if details:
        print(f"   Status: {details.get('status', 'N/A')}")
        print(f"   Version: {details.get('meta_version', 'N/A')}")
        if 'candidates' in details:
            print(f"   Candidates: {len(details['candidates'])} items")
            for c in details['candidates'][:3]:
                print(f"      - {c['ticker']} (rank: {c['rank']})")
        if 'items' in details:  # Confluence
            print(f"   Confluence Items: {len(details['items'])}")
            for item in details['items'][:3]:
                print(f"      - {item['ticker']} (score: {item['weighted_group_score']:.2f}, best: {item['best_rank']})")

print("\n" + "=" * 60)
print("DONE")
