import os
import sys
from datetime import datetime, timedelta
import logging

# Add parent directory to path to import analyzer_daily
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from analyzer_daily import run_algo_screening, logger, supabase

def backfill(days=60):
    logger.info(f"🔄 Starting Backfill for last {days} days...")
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    current = start_date
    while current <= end_date:
        target_date = current.strftime("%Y-%m-%d")
        
        # Skip weekends? (Actually crypto/global might run, but for KRX we should check data existence)
        # run_algo_screening checks for price existence internally, so we can just call it.
        
        logger.info(f"📅 Processing {target_date}...")
        try:
            run_algo_screening(target_date)
        except Exception as e:
            logger.error(f"❌ Failed for {target_date}: {e}")
            
        current += timedelta(days=1)

    logger.info("✅ Backfill Complete")

if __name__ == "__main__":
    backfill(60)
