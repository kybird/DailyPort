import FinanceDataReader as fdr
import sqlite3
import os
import pandas as pd
from datetime import datetime, timedelta
import logging

# Logging Setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Config
DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')
START_DATE_LIMIT = "20230101"

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def sync_daily_price(start_date=None, end_date=None):
    """
    Sync daily price data using FinanceDataReader.
    Includes Market Cap, PER, PBR, Dividend Yield.
    Calculates ROE (Market Proxy) = PBR / PER * 100.
    """
    if not end_date:
        end_date = datetime.now().strftime("%Y%m%d")
    
    if not start_date:
        # Default to yesterday if not specified, or extensive checking
        start_date = (datetime.now() - timedelta(days=5)).strftime("%Y%m%d")

    logger.info(f"🚀 Starting Price Sync via FDR ({start_date} ~ {end_date})")
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Get All Listed Stocks (KRX)
    try:
        df_krx = fdr.StockListing('KRX')
        if df_krx is None or df_krx.empty:
            logger.warning("⚠️ No data from KRX Listing. Likely a holiday or server/network issue.")
            return

        tickers = df_krx[['Code', 'Name', 'Market']].to_dict('records')
        
        logger.info(f"📋 Found {len(tickers)} tickers in KRX")
        
        # Update Master Table
        for t in tickers:
            cursor.execute("""
                INSERT INTO tickers (code, name, market, last_updated) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(code) DO UPDATE SET 
                    last_updated=excluded.last_updated,
                    is_active=1
            """, (t['Code'], t['Name'], t['Market'], datetime.now().isoformat()))
        conn.commit()
        
    except Exception as e:
        logger.error(f"Failed to fetch KRX listing: {e}")
        return

    # 2. Daily Price Fetch Loop
    # FDR is fast for single ticker history, or we can use fdr.DataReader for ranges
    # Since we need to update MANY tickers, we have to iterate.
    # Optimization: Filter only tickers present in our DB (which is all active ones)
    
    # Process only active tickers
    # Optimization & Fix: Filter out non-numeric codes (e.g., '0126Z0') which are special instruments causing FDR/Yahoo errors.
    cursor.execute("SELECT code FROM tickers WHERE is_active=1")
    raw_codes = [row[0] for row in cursor.fetchall()]
    active_codes = [c for c in raw_codes if c.isdigit()]
    
    skipped_count = len(raw_codes) - len(active_codes)
    logger.info(f"🔄 Syncing price data for {len(active_codes)} tickers (Skipped {skipped_count} non-numeric codes)...")
    
    total = len(active_codes)
    
    for i, code in enumerate(active_codes):
        try:
            # Fetch OHLCV
            df = fdr.DataReader(code, start_date, end_date)
            
            if df.empty:
                continue
            
            data_list = []
            for date_idx, row in df.iterrows():
                date_str = date_idx.strftime("%Y%m%d")
                
                close = float(row['Close'])
                vol = float(row['Volume'])
                
                data_list.append((
                   code, date_str,
                   float(row['Open']), float(row['High']), float(row['Low']), close,
                   vol,
                   close * vol # Rough Trading Value
                ))
                
            cursor.executemany("""
                INSERT INTO daily_price (code, date, open, high, low, close, volume, trading_value)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(code, date) DO UPDATE SET
                    open=excluded.open,
                    high=excluded.high,
                    low=excluded.low,
                    close=excluded.close,
                    volume=excluded.volume,
                    trading_value=excluded.trading_value
            """, data_list)
            
            if (i+1) % 50 == 0:
                conn.commit()
                logger.info(f"   [{i+1}/{total}] {code} synced.")
                
        except Exception as e:
            # logger.warning(f"Error syncing {code}: {e}")
            continue

    conn.commit()
    
    # 3. Update Fundamentals (Latest Only, using PyKRX)
    # FDR StockListing often misses PER/PBR. PyKRX is robust for this snapshot.
    logger.info("📊 Updating Fundamentals (Snapshot) via PyKRX...")
    try:
        from pykrx import stock
        today_str = datetime.now().strftime("%Y%m%d")
        # Try fetching for today; if fails (holiday/pre-market), try yesterday
        # PyKRX returns DataFrame with index=Code, cols=[PER, PBR, ...]
        
        # Helper to find latest valid business day? PyKRX handles strict dates.
        # Let's try today, if empty, try yesterday.
        
        def get_fundamentals(date_s):
            try:
                # KOSPI + KOSDAQ
                df_kospi = stock.get_market_fundamental_by_ticker(date_s, market="KOSPI")
                df_kosdaq = stock.get_market_fundamental_by_ticker(date_s, market="KOSDAQ")
                return pd.concat([df_kospi, df_kosdaq])
            except:
                return pd.DataFrame()

        df_fund = get_fundamentals(today_str)
        if df_fund.empty:
            # Try yesterday
            yesterday_str = (datetime.now() - timedelta(days=1)).strftime("%Y%m%d")
            df_fund = get_fundamentals(yesterday_str)
            target_date = yesterday_str
        else:
            target_date = today_str
            
        if not df_fund.empty:
            fund_updates = []
            # Columns usually: BPS, PER, PBR, EPS, DIV, DPS
            # Check columns
            has_per = 'PER' in df_fund.columns
            has_pbr = 'PBR' in df_fund.columns
            
            for code, row in df_fund.iterrows():
                # PyKRX code index might be object/int. Usually string.
                # Just in case, ensure code is strictly formatted? 
                # PyKRX returns 6 digit string for index.
                
                try:
                    per = float(row['PER']) if has_per else 0
                    pbr = float(row['PBR']) if has_pbr else 0
                    div = float(row['DIV']) if 'DIV' in df_fund.columns else 0
                    
                    # Need Market Cap too? 
                    # PyKRX fundamental call doesn't return Market Cap. `get_market_cap_by_ticker` does.
                    # We can join or just update PER/PBR first.
                    # Let's update PER/PBR/DIV first.
                    
                    # ROE Proxy
                    roe_proxy = (pbr / per * 100) if per > 0 else 0
                    
                    # We update the Specific Date row? 
                    # If we ran Price Sync for today, the row exists.
                    # If target_date != today (e.g. yesterday), we update yesterday's row.
                    
                    fund_updates.append((per, pbr, div, roe_proxy, code, target_date))
                except:
                    continue
            
            cursor.executemany("""
                UPDATE daily_price 
                SET per=?, pbr=?, div_yield=?, roe=?
                WHERE code=? AND date=?
            """, fund_updates)
            
            conn.commit()
            logger.info(f"   Updated Fundamentals (PER/PBR) for {len(fund_updates)} tickers on {target_date}.")
            
            # 4. Market Cap Update (Separate Call)
            logger.info("   Updating Market Cap via PyKRX...")
            df_cap_kospi = stock.get_market_cap_by_ticker(target_date, market="KOSPI")
            df_cap_kosdaq = stock.get_market_cap_by_ticker(target_date, market="KOSDAQ")
            df_cap = pd.concat([df_cap_kospi, df_cap_kosdaq])
            
            cap_updates = []
            for code, row in df_cap.iterrows():
                try:
                    # '시가총액' column
                    mcap = float(row['시가총액'])
                    cap_updates.append((mcap, code, target_date))
                except:
                    continue
            
            cursor.executemany("""
                UPDATE daily_price SET market_cap=? WHERE code=? AND date=?
            """, cap_updates)
            conn.commit()
            logger.info(f"   Updated Market Cap for {len(cap_updates)} tickers.")
            
        else:
            logger.warning("⚠️ Failed to fetch PyKRX fundamentals (No data for Today/Yesterday).")
            
    except Exception as e:
        logger.error(f"Fundamental update failed: {e}")

    conn.close()
    logger.info("✅ Daily Price Sync Completed.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=str, help="YYYYMMDD")
    parser.add_argument("--end", type=str, help="YYYYMMDD")
    args = parser.parse_args()
    
    sync_daily_price(args.start, args.end)
