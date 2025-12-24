import os
import sys
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
current_dir = os.path.dirname(__file__)
env_path = os.path.join(current_dir, "..", ".env.local")
load_dotenv(env_path)

url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    sys.exit(1)

supabase = create_client(url, key)

def strip_suffix(ticker: str) -> str:
    """Remove .KS or .KQ suffix from ticker"""
    return ticker.replace('.KS', '').replace('.KQ', '')

def migrate_table(table_name: str, dry_run: bool = True):
    """Migrate a single table by removing ticker suffixes"""
    print(f"\n{'[DRY RUN] ' if dry_run else ''}Processing table: {table_name}")
    
    # Fetch all records
    response = supabase.table(table_name).select("ticker").execute()
    records = response.data
    
    if not records:
        print(f"  No records found in {table_name}")
        return
    
    print(f"  Found {len(records)} records")
    
    # Group by unique tickers
    unique_tickers = set(r['ticker'] for r in records)
    updates_needed = []
    
    for ticker in unique_tickers:
        clean_ticker = strip_suffix(ticker)
        if clean_ticker != ticker:
            updates_needed.append((ticker, clean_ticker))
    
    if not updates_needed:
        print(f"  ✓ No updates needed - all tickers are already clean")
        return
    
    print(f"  Found {len(updates_needed)} tickers to update:")
    for old, new in updates_needed[:5]:  # Show first 5
        print(f"    {old} → {new}")
    if len(updates_needed) > 5:
        print(f"    ... and {len(updates_needed) - 5} more")
    
    if dry_run:
        print(f"  [DRY RUN] Would update {len(updates_needed)} tickers")
        return
    
    # Perform updates
    for old_ticker, new_ticker in updates_needed:
        try:
            # Update all records with this ticker
            supabase.table(table_name).update({
                'ticker': new_ticker
            }).eq('ticker', old_ticker).execute()
            print(f"  ✓ Updated {old_ticker} → {new_ticker}")
        except Exception as e:
            print(f"  ✗ Error updating {old_ticker}: {e}")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Remove .KS/.KQ suffixes from ticker codes')
    parser.add_argument('--execute', action='store_true', help='Actually perform the migration (default is dry-run)')
    args = parser.parse_args()
    
    dry_run = not args.execute
    
    if dry_run:
        print("=" * 60)
        print("DRY RUN MODE - No changes will be made")
        print("Run with --execute to apply changes")
        print("=" * 60)
    else:
        print("=" * 60)
        print("EXECUTING MIGRATION - Changes will be applied!")
        print("=" * 60)
        confirm = input("Are you sure? Type 'yes' to continue: ")
        if confirm.lower() != 'yes':
            print("Migration cancelled")
            return
    
    # Tables to migrate
    tables = [
        'watchlists',
        'portfolios',
        'daily_analysis_reports',
        'algo_picks'
    ]
    
    for table in tables:
        try:
            migrate_table(table, dry_run)
        except Exception as e:
            print(f"Error processing {table}: {e}")
    
    print("\n" + "=" * 60)
    if dry_run:
        print("DRY RUN COMPLETE - Run with --execute to apply changes")
    else:
        print("MIGRATION COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
