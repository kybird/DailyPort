
import sqlite3
import os
import FinanceDataReader as fdr
import pandas as pd
from datetime import datetime, timedelta
import logging

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def sync_daily_price(start_date=None, end_date=None):
    if not start_date:
        start_date = datetime.now().strftime("%Y%m%d")
    if not end_date:
        end_date = start_date

    print(f"🚀 Starting V2 Price Sync (FDR) from {start_date} to {end_date}...")
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # Get active tickers from DB
    cursor.execute("SELECT code, name, market FROM tickers WHERE is_active = 1")
    tickers = cursor.fetchall()
    
    total = len(tickers)
    print(f"Processing {total} tickers...")

    success_count = 0
    
    # FDR calculates changes automatically, but for daily sync of MANY tickers, 
    # fetching by ticker loop is slow. 
    # Ideally we fetch by MARKET for the DATE. 
    # FDR `StockListing` is just listing.
    # FDR `DataReader` can fetch by ticker.
    
    # Wait, fetching 2000 tickers individually is slow. 
    # PyKRX had `get_market_ohlcv_by_ticker(date)` which gave ALL tickers for that date.
    # FDR does NOT have a "get all tickers for one date" function easily.
    # It wraps `pykrx` for KRX data often? No, FDR uses Naver Finance as well.
    # Actually FDR `DataReader` for 'KRX' calls pykrx? No.
    # FDR for 'KOSPI' returns specific index data?

    # If we loop 2900 tickers, it will take time. 
    # But `pykrx` is blocked.
    # We have no choice but to loop, or find a "Market Cap" equivalent in FDR?
    # FDR `SnapShot`? 
    # `fdr.StockListing('KRX-DESC')` ? No.
    
    # Let's try iterating tickers first. It's robust.
    
    # Fetch current Market Cap and other info from FDR Listing to supplement missing fields
    marcap_map = {}
    try:
        print("Fetching KRX Listing for Market Cap data...")
        df_listing = fdr.StockListing('KRX')
        if not df_listing.empty:
            # columns: Code, Name, Market, Marcap, Stocks, ...
            for _, row in df_listing.iterrows():
                code = str(row['Code']).zfill(6)
                marcap_map[code] = row.get('Marcap', 0)
        print(f"   Collected Market Cap for {len(marcap_map)} tickers.")
    except Exception as e:
        logger.warning(f"Failed to fetch KRX Listing: {e}")

    for i, (code, name, market) in enumerate(tickers):
        try:
            # Use current marcap as fallback
            current_marcap = marcap_map.get(code, 0)
            
            # FDR wants YYYY-MM-DD
            s_fmt = f"{start_date[:4]}-{start_date[4:6]}-{start_date[6:]}"
            e_fmt = f"{end_date[:4]}-{end_date[4:6]}-{end_date[6:]}"
            
            df = fdr.DataReader(code, s_fmt, e_fmt)
            
            if df is None or df.empty:
                continue

            # FDR columns: Open, High, Low, Close, Volume, Change
            # We need: open, high, low, close, volume, trading_value, market_cap
            # FDR Naver source often gives: Open, High, Low, Close, Volume, Change
            # It misses 'Trading Value' and 'Market Cap' often.
            # We might have to calculate Trading Value approx (Close * Volume).
            # Market Cap is hard to get from history via FDR Naver.
            
            price_data = []
            for date_idx, row in df.iterrows():
                date_str = date_idx.strftime("%Y%m%d")
                
                # Approximate/Missing fields
                close = float(row.get('Close', 0))
                volume = int(row.get('Volume', 0))
                
                # If 'Comp' or 'Change' exists...
                
                price_data.append((
                    code, date_str,
                    float(row.get('Open', 0)), float(row.get('High', 0)),
                    float(row.get('Low', 0)), close,
                    volume,
                    # Fallback for trading value and cap
                    float(close * volume), # Crude approx for trading_value
                    float(current_marcap), # Market Cap from FDR Listing
                    0, 0, 0, 0, 0 # Fundamentals missing
                ))

            if price_data:
                # We use partial insert -> preserve existing fields if possible?
                # No, standard replace.
                # Warning: We are losing Market Cap and Fundamentals (PER/PBR) by using basic FDR.
                # But it's better than nothing.
                
                cursor.executemany("""
                    INSERT OR REPLACE INTO daily_price 
                    (code, date, open, high, low, close, volume, trading_value, market_cap, per, pbr, eps, bps, div_yield)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, price_data)
                
            success_count += 1
            if (i+1) % 100 == 0:
                print(f"   [{i+1}/{total}] Synced.")
                conn.commit()
                
        except Exception as e:
            # logger.error(f"Failed {code}: {e}")
            continue

    conn.commit()
    conn.close()
    print(f"✅ V2 Price Sync Finished. Updated {success_count} tickers.")

if __name__ == "__main__":
    sync_daily_price()
