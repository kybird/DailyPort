import os
import sys
import logging
import sqlite3
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Config
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load Env
env_paths = [
    os.path.join(os.path.dirname(__file__), '.env'),
    os.path.join(os.path.dirname(__file__), '../.env.local'),
    os.path.join(os.path.dirname(__file__), '../../.env.local')
]
for p in env_paths:
    if os.path.exists(p):
        load_dotenv(p)
        break

DART_API_KEY = os.getenv("DART_API_KEY")
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')

def validate_fdr():
    logger.info("=== Validating FinanceDataReader (FDR) ===")
    try:
        import FinanceDataReader as fdr
        # Test 1: Stock Listing
        df_krx = fdr.StockListing('KRX')
        if not df_krx.empty:
            logger.info(f"✅ FDR StockListing: Success ({len(df_krx)} tickers found)")
        else:
            logger.error("❌ FDR StockListing: Returned empty DataFrame")
        
        # Test 2: Price Data (Samsung Electronics - 005930)
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        df_price = fdr.DataReader('005930', start_date, end_date)
        if not df_price.empty:
            logger.info(f"✅ FDR DataReader (005930): Success ({len(df_price)} rows)")
            logger.info(f"   Latest date: {df_price.index[-1].strftime('%Y-%m-%d')}, Close: {df_price['Close'].iloc[-1]}")
        else:
            logger.error("❌ FDR DataReader: Returned empty DataFrame")
            
    except Exception as e:
        logger.error(f"❌ FDR Validation Error: {e}")

def validate_dart():
    logger.info("\n=== Validating OpenDart (DART) ===")
    if not DART_API_KEY:
        logger.error("❌ DART_API_KEY is missing in .env files.")
        return

    try:
        import OpenDartReader
        dart = OpenDartReader(DART_API_KEY)
        
        # Test 1: Corp Codes
        df_corp = dart.corp_codes
        if df_corp is not None and not df_corp.empty:
            logger.info(f"✅ DART Corp Codes: Success ({len(df_corp)} corps found)")
        else:
            logger.error("❌ DART Corp Codes: Returned empty/None")

        # Test 2: Financial State (Samsung Electronics - Corp Code: 00126380)
        # Year 2024, Q3 (11014)
        try:
            df_fs = dart.finstate('00126380', 2024, '11014')
            if not df_fs.empty:
                logger.info("✅ DART finstate (Samsung 2024 Q3): Success")
            else:
                logger.warning("⚠️ DART finstate: Returned empty (might be fine if not published yet, but Samsung 2024 Q3 should exist)")
        except Exception as api_err:
            logger.error(f"❌ DART finstate API Error: {api_err}")

    except Exception as e:
        logger.error(f"❌ DART Validation Error: {e}")

def validate_pykrx():
    logger.info("\n=== Validating PyKRX (Known to be problematic) ===")
    try:
        from pykrx import stock
        # Test 1: Ticker List
        tickers = stock.get_market_ticker_list(market="KOSPI")
        if tickers:
            logger.info(f"✅ PyKRX Ticker List: Success ({len(tickers)} KOSPI tickers)")
        else:
            logger.error("❌ PyKRX Ticker List: Empty")

        # Test 2: Supply Data (Net Purchase)
        target_date = (datetime.now() - timedelta(days=1))
        while target_date.weekday() >= 5: # Skip weekends
            target_date -= timedelta(days=1)
        date_str = target_date.strftime("%Y%m%d")
        
        try:
            df = stock.get_market_net_purchases_of_equities_by_ticker(date_str, date_str, "KOSPI")
            if not df.empty:
                logger.info(f"✅ PyKRX Supply Data ({date_str}): Success")
            else:
                logger.error(f"❌ PyKRX Supply Data ({date_str}): Returned empty (Blocked/Holiday?)")
        except Exception as e:
            logger.error(f"❌ PyKRX Supply Data API Error: {e}")

    except Exception as e:
        logger.error(f"❌ PyKRX Validation Error: {e}")

if __name__ == "__main__":
    validate_fdr()
    validate_dart()
    validate_pykrx()
